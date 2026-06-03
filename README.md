# Top Rated — Cards & Collectibles

Premium ecommerce storefront for a family-owned card shop. Next.js 16 App Router, React 19, TypeScript, CSS Modules. Supabase + Clover are the planned backend; the demo runs on a JSON fallback until those are provisioned.

## Live site

- **Production (Netlify):** https://topratedcc.netlify.app/
- **GitHub:** https://github.com/HackingHobbit/TopRated

Note: the Netlify site is configured through the Netlify dashboard, not a root `netlify.toml`. The only `netlify.toml` in the repo lives under `legacy-prototype/` and applies to the pre-Next.js static prototype — do not treat it as authoritative for the current app.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The app runs in **mock mode** when Supabase env vars are absent — any login works and the mock user has admin role so `/admin` is reachable.

To wire up the real backend, copy `.env.example` to `.env.local`, fill in the Supabase keys, and follow `SUPABASE_SETUP.md`.

## Project docs

- `docs/SPECIFICATION.md` — product spec and business logic
- `docs/FRONTEND_BACKEND_TODO.md` — phased roadmap
- `AUDIT.md` — May 21 codebase audit (bugs, Next 16 fit, perf)
- `PRODUCTION_AUDIT.md` — May 25 launch-readiness tiers
- `SUPABASE_SETUP.md` — Supabase provisioning runbook

## Scripts

- `npm run dev` — Next dev server (Turbopack, port 3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `python3 scripts/ingest_inventory.py` — re-run the Clover xlsx → `data/db.json` ingest (idempotent)

## Stack

- Next.js 16.2.6 (App Router, Turbopack) · React 19.2 · TypeScript
- CSS Modules with a dark/glassmorphism design system
- Supabase (planned) for Postgres + Auth
- Clover Commerce API (planned) for payments and POS sync
