#!/usr/bin/env python3
"""Live image-review server.

Serves the review gallery AND lets you re-run the SearXNG image search per
product from inside the page (server-side, so no browser CORS issue):

  1) start SearXNG (docker), then:
  2) python3 scripts/review_server.py
  3) open http://127.0.0.1:8099/

In the page:
  - "Keep looking" (header checkbox, on by default): clicking "No good match"
    on a product auto-fetches a fresh batch of candidates for it.
  - "Search again" (per product): edit the query box and re-run the search to
    get images that genuinely match the product.

Each re-search uses the next query variant (or your typed query), EXCLUDES the
images already shown, merges + re-ranks, caps at 12, and saves back to
image_candidates.json so progress persists.
"""
import json
import os
import re
import sys
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import enrich_images as E       # noqa: E402  (search/rank helpers + SEARX url)
import build_review as B        # noqa: E402  (render_html)

# Paths + bind address are env-overridable for the portable Docker kit; the
# defaults reproduce the in-repo layout.
CANDIDATES = Path(os.environ.get("CANDIDATES_PATH", HERE / "image_candidates.json"))
DB_PATH = Path(os.environ.get("DB_PATH", HERE.parent / "data" / "db.json"))
PRODUCTS = json.loads(DB_PATH.read_text())["products"]
PBYID = {p["id"]: p for p in PRODUCTS}
HOST = os.environ.get("REVIEW_HOST", "127.0.0.1")
PORT = int(os.environ.get("REVIEW_PORT", "8099"))
CAP = 12                        # max candidates kept per product
attempts = {}                   # pid -> how many auto-variant re-searches so far


def load():
    return json.loads(CANDIDATES.read_text())


def save(data):
    CANDIDATES.write_text(json.dumps(data, indent=2))


def query_variants(pid, fallback_name):
    name = (PBYID.get(pid) or {}).get("name") or fallback_name
    stripped = re.sub(r"^\d{4}(-\d{2,4})?\s*", "", name).strip()
    return [
        f"{name} trading cards",
        f"{name} sealed box",
        f"{name} booster box hobby",
        f"{stripped} product image",
        name,
    ]


def do_requery(pid, typed_query):
    data = load()
    rec = next((r for r in data if r["id"] == pid), None)
    if rec is None:
        return {"error": "unknown product id"}
    existing = {c["url"] for c in rec.get("candidates", [])}
    if typed_query:
        query = typed_query
    else:
        n = attempts.get(pid, 0)
        variants = query_variants(pid, rec["name"])
        query = variants[n % len(variants)]
        attempts[pid] = n + 1
    try:
        fresh = E.searx_search(query, top=8, exclude=existing)
    except Exception as e:
        return {"error": f"search failed: {e}"}
    merged = rec.get("candidates", []) + fresh
    seen, dedup = set(), []
    for c in sorted(merged, key=lambda c: c.get("score", 0), reverse=True):
        if c["url"] in seen:
            continue
        seen.add(c["url"])
        dedup.append(c)
    rec["candidates"] = dedup[:CAP]
    rec["query"] = query
    save(data)
    return {"id": pid, "query": query, "candidates": rec["candidates"]}


def do_add(pid, url):
    if not url.lower().startswith(("http://", "https://")):
        return {"error": "url must start with http(s)://"}
    data = load()
    rec = next((r for r in data if r["id"] == pid), None)
    if rec is None:
        return {"error": "unknown product id"}
    rec.setdefault("candidates", [])
    if not any(c["url"] == url for c in rec["candidates"]):
        host = urllib.parse.urlparse(url).netloc
        rec["candidates"].insert(0, {
            "url": url, "thumb": url, "page": url, "host": host,
            "engine": "pasted", "resolution": "pasted", "w": 0, "h": 0, "score": 9999,
        })
        save(data)
    return {"ok": True}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, ctype, body):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path in ("/", "/index.html", "/image_review.html"):
            html = B.render_html(load(), live=True).encode("utf-8")
            return self._send(200, "text/html; charset=utf-8", html)
        if u.path == "/api/requery":
            qs = urllib.parse.parse_qs(u.query)
            pid = (qs.get("id") or [""])[0]
            q = (qs.get("q") or [""])[0].strip()
            out = do_requery(pid, q)
            return self._send(200, "application/json", json.dumps(out).encode("utf-8"))
        if u.path == "/api/add":
            qs = urllib.parse.parse_qs(u.query)
            pid = (qs.get("id") or [""])[0]
            url = (qs.get("url") or [""])[0].strip()
            return self._send(200, "application/json", json.dumps(do_add(pid, url)).encode("utf-8"))
        return self._send(404, "text/plain", b"not found")

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    shown = "127.0.0.1" if HOST in ("0.0.0.0", "") else HOST
    print(f"Review server:  http://{shown}:{PORT}/")
    print(f"SearXNG:        {E.SEARX}  (must be running)")
    print("Ctrl-C to stop.")
    try:
        ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        pass
