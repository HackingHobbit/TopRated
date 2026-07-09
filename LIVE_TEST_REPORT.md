# Top Rated — Live Site Test & Audit

**Date:** July 9, 2026 · **Target:** https://topratedcc.netlify.app (live) · **Repo HEAD at test:** `ba345f3`
**Method:** real-browser walkthrough (Chrome) + HTTP probing + source review, cross-checked by a 15-agent verification workflow. Findings are grounded in observed evidence; anything unverifiable without an authenticated session is marked as such.

---

## 🔴 CRITICAL — the store is down: Supabase backend is unreachable

The **frontend is healthy, but the backend host does not resolve.** `oiibvgnsqbbpjotgedxs.supabase.co` returns **NXDOMAIN** from multiple independent resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1, Cloudflare DoH). A real-browser `fetch` to it returns `TypeError: Failed to fetch`.

**User-facing impact right now:**
- The homepage featured/new/pre-order sections are empty; `/shop` shows **"No products found"**; every product detail page **404s**.
- Login, signup, admin, and checkout all depend on Supabase and would fail on use.

**Why it's *total* (not partial):** `lib/db.ts` `getProducts()` takes the Supabase path whenever env vars are present (they are) and **returns `[]` on any error, with no `data/db.json` fallback** — so a backend blip silently empties the entire catalog instead of degrading or surfacing an error.

**Root cause & remedy (owner action — I can't do this):**
- NXDOMAIN means the project host is gone, not merely slow. Open the Supabase dashboard and check the `TopRatedCC` project:
  - **If "Paused"** (free-tier inactivity — the risk flagged at setup): click **Restore/Resume**. Data is preserved. Then it's back.
  - **If deleted/missing** (paused projects can eventually be removed): you'll need to recreate the project, re-run `supabase/migrations/0001` + `0002`, re-push products (`scripts/migrate_to_supabase.py`), and update `NEXT_PUBLIC_SUPABASE_URL` / keys in `.env.local` **and Netlify**, then redeploy.
- **Prevention:** free-tier projects auto-pause. Add a keep-alive (a scheduled ping every few days) or upgrade to Supabase Pro (~$25/mo, no auto-pause).

Everything below is **masked by this outage** until the backend is restored.

---

## ✅ Healthy (verified live)

- **Deploy is current:** live HEAD == `origin/main` == `ba345f3`; homepage HTTP 200 via Netlify + Next.js (Turbopack) — the real app, not the legacy prototype.
- **Real Supabase mode** is baked in (no "Demo mode" banner on `/login`).
- **Admin gate works & fails safe:** `/admin`, `/admin/users`, `/admin/singles`, `/admin/inventory` all 307 → `/login?redirect=/admin` for anonymous users — even with the backend down (it doesn't error or leak).
- **Recent mobile fix shipped:** `/shop` HTML has the "Filters & Sort" collapse toggle; served CSS has the ≤767px collapse + ≥768px row rules. Navbar hamburger menu also live.
- **Secret hygiene clean:** scanned ~1 MB across 16 JS chunks — no service-role key / JWT leaked; only the browser-safe publishable key. Service key is `server-only`. No `.env` tracked in git.
- **Some security headers present:** HSTS (`max-age=31536000; includeSubDomains; preload`) and `X-Content-Type-Options: nosniff`; admin redirects carry `Cache-Control: private/no-store`.
- **Root SEO basics:** homepage `<title>` + meta description present and indexable; not-found pages noindexed.

---

## What still needs doing (prioritized, verified in source)

**Blocker**
- Restore the Supabase backend (above). Nothing sells until this is done.

**High**
- **Resilience:** make `getProducts()` degrade gracefully (fall back to `db.json` or show an explicit error) instead of returning `[]`, so a backend outage never silently empties the store. *(new finding)*
- **Payments are fully mock** — card fields collected but never charged; the store cannot transact. (Phase A2 / Clover.)
- **Admin dashboard** metrics + Recent Activity are hardcoded literals (only the date is dynamic).
- **Admin Orders** table is mock rows; Search / Export CSV / Fulfill / View are no-ops.
- **Account order history** is a hardcoded fake order — a customer who places a real order never sees it. (Data-integrity defect: `placeOrder` persists real orders, but `/account` shows a fabricated one.)
- **SEO:** PDPs have no `generateMetadata` (generic root `<title>` everywhere); `/sitemap.xml` 404s; shop is client-only + currently empty, so no crawlable product content/links.
- **Security header:** no `Content-Security-Policy` site-wide.

**Medium**
- Confirm live order **persistence** — depends on `SUPABASE_SERVICE_ROLE_KEY` being set in Netlify (verified locally; not re-checkable while backend is down).
- **Tax** hardcoded to 0; no tax line in the checkout summary.
- **Order lifecycle:** orders persist as `pending` and nothing ever advances them (no fulfillment flow).
- No `X-Frame-Options` / CSP `frame-ancestors` (clickjacking exposure on login/admin).
- No Open Graph / Twitter cards; no JSON-LD (Product/Organization/Breadcrumb); `robots.txt` 404s; no canonicals / `metadataBase`.
- **No pagination** — all 432 seed products render at once client-side on `/shop`.

**Low**
- `Referrer-Policy` / `Permissions-Policy` headers absent.
- Remaining mobile polish (MASTER_PLAN §3): table card-reflow, cart-drawer width, tap targets.
- Anon admin sub-route redirect drops the requested sub-path (goes to `/admin`, not the sub-page).

**Confirmed bugs (precisely located)**
- **Two dead "Pokémon" links:** the hero **"Browse TCG"** (`app/page.tsx:74`) and the footer **"TCG Cards"** (`components/Footer.tsx:38`) point at `?subCategory=Pokémon`, which doesn't exist (seed data uses `subCategory=TCG`; Pokémon is only a search term). Both show "No products found." The header-nav Pokémon link is correct (`subCategory=TCG&search=Pokemon`). *(masked by the outage right now)*
- Cosmetic: deferred-phase labels are inconsistent in code — checkout copy says "Phase 5", `orderActions.ts` comments say "A2/A3".

---

## Needs manual/authenticated verification once the backend is back
- Login / signup end-to-end; user + singles CRUD; non-admin → `/account` bounce.
- Live order persistence (place a test order → appears in DB/admin) and the role-escalation trigger enforcement.
- Admin ≤768px mobile stacking (auth-gated, couldn't be seen live).
- Shop filter toggle runtime interaction + 360–414px layout.

---

## Recommended order of operations
1. **Restore the backend** (owner) — un-breaks home, shop, and all PDPs in one move; then browser-verify products, a real PDP `<title>`, and sign-in.
2. **Resilience + persistence** — graceful `getProducts()` fallback; confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Netlify so checkout actually writes orders.
3. **Connect read surfaces to real data** — account order history, admin dashboard, admin Orders (+ status transitions). Core data-integrity fix.
4. **Commerce essentials** — Clover payments + real tax with a tax line.
5. **SEO + security headers as a batch** — `generateMetadata` on PDPs, `app/sitemap.ts`, `app/robots.ts`, OG/Twitter + JSON-LD + `metadataBase`/canonicals; CSP + `X-Frame-Options` + `Referrer-Policy` + `Permissions-Policy` via `next.config.ts` headers(); and fix the two `subCategory=Pokémon` links.

## Sources
- Live browser walkthrough + HTTP/DNS probes + source review, verified by the `live-site-audit` workflow (15 agents, adversarially cross-checked).
- Living plan: `MASTER_PLAN.md`. Prior snapshots: `AUDIT.md`, `PRODUCTION_AUDIT.md`.
