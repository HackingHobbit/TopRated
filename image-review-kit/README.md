# Top Rated — Image Review Kit

A self-contained, portable version of the product-image review workflow:
a local **SearXNG** metasearch instance plus the **review gallery** server,
wired together with Docker Compose. Copy this folder to any machine with
Docker, run one command, and review images in your browser.

## What's inside

| Path | What it is |
|------|-----------|
| `docker-compose.yml` | Starts SearXNG + the review gallery together |
| `Dockerfile` / `requirements.txt` | Builds the gallery server image |
| `searxng/settings.yml` | SearXNG config (localhost/API use, JSON on, limiter off) |
| `scripts/` | The gallery + search + publish Python (vendored from the main repo) |
| `data/db.json` | The product catalog to review |
| `work/image_candidates.json` | Candidate images per product (the review set) |
| `.env.example` | Template for Supabase creds — **only** for publishing |

`work/` is where everything mutable lives and is mounted from the host, so your
candidates, outputs, and any catalog updates persist across restarts.

## Prerequisites

- **Docker Desktop** (Mac/Windows) or Docker Engine + Compose v2 (Linux).

That's the only requirement — no Python, no Node.

## Quick start (review images)

```sh
cd image-review-kit
docker compose up -d --build
```

Then open **http://127.0.0.1:8099/** in your browser.

In the gallery you can, per product:

- **Click a candidate** to select it (or **No good match**).
- Tick **"representative image"** when a match is close but not the exact item
  (the storefront then shows a "may vary" note to shoppers).
- Use **Search again** to re-run SearXNG with a refined query, or leave
  **Keep looking** on so rejects auto-refetch.
- **Paste an image URL** from a vendor page to add it as a candidate.
- **⤓ Import / Export approvals.json** to save or restore your progress.

Stop everything with:

```sh
docker compose down
```

## Moving progress between machines

Your selections live in the **browser** (localStorage), so they don't travel
with the folder. To move progress:

1. On machine A, click **Export approvals.json** (downloads the file).
2. Copy that file to machine B.
3. On machine B, open the gallery and click **Import approvals.json** → pick the
   file. Your picks (and representative flags) are restored.

To also move the *candidate set* (so both machines show the same images),
copy `work/image_candidates.json` alongside it.

## Publishing approved images to Supabase (`--apply`)

This step downloads each approved image, compresses it, re-hosts it into your
Supabase Storage bucket, sets `products.image` (+ `image_representative`), and
updates `data/db.json`.

1. Create your creds file:
   ```sh
   cp .env.example .env
   # edit .env — fill in NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
   ```
   The service-role key is a **secret**. `.env` is gitignored; never commit or
   share it.

2. Put your approvals file where the container can see it — the simplest is to
   save/copy it into `work/`:
   ```sh
   cp ~/Downloads/approvals.json work/approvals.json
   ```

3. Publish:
   ```sh
   docker compose exec review \
     python3 scripts/enrich_images.py --apply work/approvals.json
   ```

Applied images are recorded in `work/image_map.json`, and `data/db.json` is
updated so the change survives a re-import.

## Re-running searches (optional)

The kit ships with a candidate set already. To (re)search from scratch inside
the container:

```sh
docker compose exec review python3 scripts/enrich_images.py --all      # every product
docker compose exec review python3 scripts/enrich_images.py --category tcg --limit 20
```

## Refreshing the kit from the main repo

If the scripts/catalog change upstream, re-vendor them:

```sh
sh refresh-from-repo.sh      # run from inside the main TopRated checkout
```

(You don't need this on a standalone machine — the folder already contains
everything.)

## Notes / safety

- Both services are bound to **localhost only** — nothing is exposed to your
  network. SearXNG has no host port at all; the gallery is on `127.0.0.1:8099`.
- SearXNG's `limiter` is off *because* it's unreachable from the network. Don't
  publish these ports to `0.0.0.0`.
- The gallery is a review tool — it never changes your live store. Only the
  explicit `--apply` step writes to Supabase.
