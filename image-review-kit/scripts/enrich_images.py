#!/usr/bin/env python3
"""Product-image enrichment pipeline for Top Rated.

Two phases so a human always confirms before anything goes live:

  1) SEARCH  (default):  find candidate images for every product that still
     has a placeholder (loremflickr) or no image. Uses the local SearXNG
     instance's JSON image search, ranks candidates by resolution + trusted
     hobby/manufacturer domains, and writes scripts/image_candidates.json.
     Then run build_review.py to generate a review gallery.

  2) APPLY   (--apply approvals.json):  for each product the reviewer approved,
     download -> compress -> re-host into the Supabase `product-images` bucket,
     set products.image in Supabase, and record the mapping (with provenance)
     in scripts/image_map.json + data/db.json so it survives re-imports.

Design note: SearXNG is the primary adapter (it covers sealed boxes AND cards).
Card-specific APIs (Scryfall / pokemontcg.io / YGOPRODeck) and UPC lookup are
easy to add as extra `search_*` adapters — barcodes aren't in db.json yet, so
UPC is deferred.

Usage:
  python3 scripts/enrich_images.py                 # balanced sample (default 15)
  python3 scripts/enrich_images.py --all           # every product needing an image
  python3 scripts/enrich_images.py --category tcg --limit 20
  python3 scripts/enrich_images.py --apply scripts/approvals.json
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Paths are env-overridable so the same script works both in-repo (defaults
# below) and in the portable Docker kit (which mounts data/ + work/ elsewhere).
DB = Path(os.environ.get("DB_PATH", ROOT / "data" / "db.json"))
CANDIDATES = Path(os.environ.get("CANDIDATES_PATH", ROOT / "scripts" / "image_candidates.json"))
IMAGE_MAP = Path(os.environ.get("IMAGE_MAP_PATH", ROOT / "scripts" / "image_map.json"))
ENV_LOCAL = Path(os.environ.get("ENV_LOCAL_PATH", ROOT / ".env.local"))

SEARX = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8080")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Domains we trust for genuine product shots (hobby retailers / distributors /
# manufacturers / card marketplaces). Higher-ranked; not an exclusive list.
TRUSTED = [
    "steelcitycollectibles.com", "blowoutcards.com", "dacardworld.com",
    "gtsdistribution.com", "collectorstore.com", "cloutsnchara.com",
    "beckett", "tcgplayer.com", "tcgplayer-cdn.tcgplayer.com", "topps.com",
    "paniniamerica.net", "fanatics", "pokemoncenter.com", "pokemon.com",
    "upperdeck.com", "panini", "cardboardconnection.com", "ebayimg.com",
    "shopify.com", "squarespace-cdn.com", "bigcommerce.com",
]
# Domains that are usually junk / broken previews for product images.
JUNK = ["jsdelivr.net", "unsplash", "artic.edu", "fbsbx.com", "lookaside",
        "pinterest", "pinimg.com", "wikimedia", "gravatar"]

TOP_N = 6  # candidates kept per product for review


def load_env():
    """Supabase URL + service key for the apply phase.

    Reads .env.local if present, then falls back to the process environment
    (the Docker kit injects these via docker-compose env_file / -e).
    """
    vals = {}
    if ENV_LOCAL.exists():
        for line in ENV_LOCAL.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip()
    for k in ("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not vals.get(k) and os.environ.get(k):
            vals[k] = os.environ[k]
    return vals


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def build_query(p):
    name = p["name"].strip()
    cat = (p.get("category") or "").lower()
    if cat in ("sports", "tcg"):
        return f"{name} trading cards"
    return name


def dims(res):
    if not res:
        return (0, 0)
    nums = re.findall(r"\d+", str(res))
    if len(nums) >= 2:
        return (int(nums[0]), int(nums[1]))
    return (0, 0)


def host_of(url):
    try:
        return urllib.parse.urlparse(url).netloc.lower()
    except Exception:
        return ""


def score(cand):
    w, h = cand["w"], cand["h"]
    host = cand["host"]
    s = 0.0
    area = w * h
    s += min(area, 4_000_000) / 4_000_000 * 100          # size, capped ~2000x2000
    if any(t in host for t in TRUSTED):
        s += 60
    if any(j in host for j in JUNK):
        s -= 500
    if cand["engine"] in ("google images", "bing images", "startpage images", "duckduckgo images"):
        s += 20
    if 0 < w < 300 or 0 < h < 300:
        s -= 40
    return round(s, 1)


def searx_search(query, top=TOP_N, pageno=1, exclude=None):
    exclude = exclude or set()
    params = {"q": query, "categories": "images", "format": "json", "safesearch": "0"}
    if pageno > 1:
        params["pageno"] = pageno
    qs = urllib.parse.urlencode(params)
    data = http_json(f"{SEARX}/search?{qs}")
    out = []
    seen = set()
    for r in data.get("results", []):
        src = r.get("img_src") or r.get("thumbnail_src")
        if not src or src in seen or src in exclude:
            continue
        seen.add(src)
        w, h = dims(r.get("resolution"))
        c = {
            "url": src,
            "thumb": r.get("thumbnail_src") or src,
            "page": r.get("url"),
            "engine": r.get("engine", "?"),
            "resolution": r.get("resolution", ""),
            "host": host_of(src),
            "w": w, "h": h,
        }
        c["score"] = score(c)
        out.append(c)
    out = [c for c in out if c["score"] > -100]           # drop hard-junk
    out.sort(key=lambda c: c["score"], reverse=True)
    return out[:top]


def needs_image(p):
    img = p.get("image") or ""
    return ("loremflickr" in img) or (img == "")


def select_targets(prods, args):
    targets = [p for p in prods if needs_image(p)]
    if args.category:
        targets = [p for p in targets if (p.get("category") or "").lower() == args.category.lower()]
    if args.all:
        return targets
    if args.limit:
        return targets[: args.limit]
    # default: a category-balanced sample for a representative demo
    by_cat = {}
    for p in targets:
        by_cat.setdefault((p.get("category") or "?"), []).append(p)
    plan = {"sports": 4, "tcg": 4, "accessories": 3, "beverages": 2, "memorabilia": 2}
    rng = random.Random(7)
    picked = []
    for cat, n in plan.items():
        pool = by_cat.get(cat, [])
        rng.shuffle(pool)
        picked += pool[:n]
    return picked[: args.sample]


def run_search(args):
    prods = json.loads(DB.read_text())["products"]
    targets = select_targets(prods, args)
    order = [p["id"] for p in targets]

    # Resume: keep any records we already have (unless --fresh), skip re-searching.
    have = {}
    if CANDIDATES.exists() and not args.fresh:
        try:
            for r in json.loads(CANDIDATES.read_text()):
                have[r["id"]] = r
        except Exception:
            have = {}
    todo = [p for p in targets if p["id"] not in have]

    def flush():
        ordered = [have[i] for i in order if i in have]
        CANDIDATES.write_text(json.dumps(ordered, indent=2))

    print(f"SearXNG: {SEARX}  |  targets: {len(targets)}  |  "
          f"already have: {len(targets) - len(todo)}  |  to search: {len(todo)}")
    for i, p in enumerate(todo, 1):
        q = build_query(p)
        try:
            cands = searx_search(q)
        except Exception as e:
            print(f"  [{i}/{len(todo)}] {p['name'][:40]!r} ERROR: {e}")
            cands = []
        top = cands[0]["host"] if cands else "(none)"
        print(f"  [{i}/{len(todo)}] {p['name'][:44]:<44} -> {len(cands)} cand, top={top}")
        have[p["id"]] = {
            "id": p["id"], "name": p["name"], "category": p.get("category"),
            "subCategory": p.get("subCategory"), "query": q, "candidates": cands,
        }
        if i % 10 == 0:
            flush()                                          # checkpoint every 10
        time.sleep(args.delay + random.uniform(0, 0.8))      # be polite to upstream engines
    flush()
    ordered = [have[i] for i in order if i in have]
    got = sum(1 for r in ordered if r["candidates"])
    print(f"\nWrote {CANDIDATES} — {got}/{len(ordered)} products have candidates.")
    print("Next: python3 scripts/build_review.py  (then open scripts/image_review.html)")


# ---------------------------------------------------------------- apply phase
def _compress(data, content_type):
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((1200, 1200))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=85)
        return buf.getvalue(), "image/jpeg"
    except Exception:
        return data, content_type  # Pillow missing / decode failed -> original


def run_apply(args):
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("apply needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local")
    approvals = json.loads(Path(args.apply).read_text())  # [{id, url}] or {id: url}
    if isinstance(approvals, dict):
        approvals = [{"id": k, "url": v} for k, v in approvals.items()]
    image_map = json.loads(IMAGE_MAP.read_text()) if IMAGE_MAP.exists() else {}
    db = json.loads(DB.read_text())
    by_id = {p["id"]: p for p in db["products"]}
    done = 0
    for a in approvals:
        pid, src = a["id"], a["url"]
        representative = bool(a.get("representative"))
        try:
            req = urllib.request.Request(src, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                blob, ct = r.read(), r.headers.get("Content-Type", "image/jpeg")
            blob, ct = _compress(blob, ct)
            path = f"enriched/{pid}.jpg"
            up = urllib.request.Request(
                f"{url}/storage/v1/object/product-images/{path}", data=blob, method="POST",
                headers={"apikey": key, "Authorization": f"Bearer {key}",
                         "Content-Type": ct, "x-upsert": "true"})
            urllib.request.urlopen(up, timeout=60).read()
            public = f"{url}/storage/v1/object/public/product-images/{path}"
            patch = urllib.request.Request(
                f"{url}/rest/v1/products?id=eq.{urllib.parse.quote(pid)}",
                data=json.dumps({"image": public, "image_representative": representative}).encode(),
                method="PATCH",
                headers={"apikey": key, "Authorization": f"Bearer {key}",
                         "Content-Type": "application/json", "Prefer": "return=minimal"})
            urllib.request.urlopen(patch, timeout=30).read()
            image_map[pid] = public
            if pid in by_id:
                by_id[pid]["image"] = public
                by_id[pid]["imageRepresentative"] = representative
            done += 1
            tag = "  [representative]" if representative else ""
            print(f"  applied {pid}  {by_id.get(pid,{}).get('name','')[:40]}{tag}")
        except Exception as e:
            print(f"  FAILED {pid}: {e}")
    IMAGE_MAP.write_text(json.dumps(image_map, indent=2))
    DB.write_text(json.dumps(db, indent=2))
    print(f"\nApplied {done}/{len(approvals)}. Updated image_map.json + db.json + Supabase products.image.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="every product needing an image")
    ap.add_argument("--category", help="limit to one category (sports/tcg/accessories/...)")
    ap.add_argument("--limit", type=int, help="cap the number of targets")
    ap.add_argument("--sample", type=int, default=15, help="balanced sample size (default 15)")
    ap.add_argument("--delay", type=float, default=1.5, help="base seconds between searches")
    ap.add_argument("--fresh", action="store_true", help="ignore existing candidates and re-search all")
    ap.add_argument("--apply", help="approvals.json -> download/re-host/set live")
    args = ap.parse_args()
    if args.apply:
        run_apply(args)
    else:
        run_search(args)


if __name__ == "__main__":
    main()
