# Top Rated — Production Readiness Audit

**Date:** May 25, 2026 · **Stack:** Next.js 16.2.6, React 19.2, TypeScript, CSS Modules
**Live site:** https://topratedcc.netlify.app/ (Netlify; configured via dashboard, no root `netlify.toml`)
**Repo:** https://github.com/HackingHobbit/TopRated

> **⚠️ This is a May 25 historical snapshot. For current status, see [`MASTER_PLAN.md`](MASTER_PLAN.md)** — the living source of truth.
>
> **Resolved since this audit (as of June 21):** §1.1 Supabase Auth · §1.2 Supabase Postgres (products live) · §1.4 order persistence (orders/items/transactions, server-priced) · §1.6 admin authentication (+ role-escalation fix) · §1.8 admin Customers page (real data) · plus out-of-stock enforcement and the full **user/staff admin** and **singles + photo-capture** features (not in the original tiers).
>
> **Still open (launch-blocking):** §1.3 real payments (Clover) · §1.5 transactional email · §1.7 real product images · §1.9 tax · §1.10 legal/content pages. Account order history, the admin dashboard/Orders pages, cart persistence, pagination, and SEO remain per Tiers 2–4.
>
> **Also flagged (new, high priority):** the site is **desktop-first and looks broken on mobile** (shop filters bury products; admin sidebar/tables overflow). Tracked as **Phase M** in `MASTER_PLAN.md` §3.

This audit picks up after the inventory ingest and the in-session bug fixes. It answers the question: **what's still required to turn this from a prototype into a real, functioning ecommerce site you can actually take orders on?**

I've grouped the work into four tiers by ship-blocking severity. The first tier is "you cannot go live without this." The bottom tier is polish.

---

## TIER 1 — Cannot launch without these

These are the ten things that make this site a real store instead of a polished prototype. Everything else can wait.

### 1.1 Replace mock auth with Supabase Auth (or equivalent)
**Where it's mocked:** `contexts/AuthContext.tsx` — accepts any email, password is ignored, "session" lives in localStorage as a boolean.
**What you need:**
- Real Supabase Auth project (or Clerk / Auth.js / Cognito — whatever you decide).
- Email + password signup (`/signup` route doesn't exist yet).
- Email verification flow.
- Forgot password / reset flow.
- Auth cookie that the server can read in Server Components via `await cookies()`.
- Replace the localStorage hack in `AuthContext` with a real session read.

### 1.2 Replace `data/db.json` with Supabase Postgres
**Where it's mocked:** `lib/db.ts` reads from disk; `lib/actions.ts` writes to disk.
**Tables you need (per `docs/SPECIFICATION.md`):**
- `inventory` — replaces db.json. Add `quantity`, `cost`, `sku`, `barcode` columns to match the Clover export.
- `customers` — auth user → profile (loyalty_points, clover_customer_id, address book).
- `orders` — header (status, total, customer, shipping address, clover_order_id).
- `order_items` — line items (order_id, product_id, qty, unit_price snapshot).
- `categories` — top-level + subcategories (currently a hard-coded `TOP_CATEGORY` dict in `scripts/ingest_inventory.py`).
- `inventory_transactions` — every stock change (purchase, return, manual adjust) for audit.
- Row Level Security on every table.

The ingestion script (`scripts/ingest_inventory.py`) already produces the canonical shape — pointing it at Supabase instead of a JSON file is a half-day job, not a rewrite.

### 1.3 Real payment processing (Clover)
**Where it's mocked:** `app/checkout/page.tsx` collects card number/expiry/CVC into plain `<input>` fields and throws them away on `setTimeout` → success.
**What you need:**
- Clover hosted iframe for card collection (so card data never touches your server — your spec calls this out).
- Clover Ecommerce API tokenize → charge flow.
- Webhook endpoint to listen for `payment.success` / `payment.failed`.
- Save `clover_order_id` to your `orders` table.
- Idempotency keys so reloading the success page doesn't double-charge.
- A `/checkout/canceled` route for failed payments.

### 1.4 Persist orders on submission
**Where it's mocked:** the checkout success screen just shows a random order number and clears the cart. Nothing is saved.
**What you need:**
- On payment success, INSERT the order + line items.
- Decrement `inventory.quantity` for each line.
- Send confirmation email (see §1.5).
- Update the customer's loyalty points.
- The `account/page.tsx` order history is currently hard-coded JSX — replace it with a real query.

### 1.5 Transactional email
**Where it's missing:** nowhere.
**What you need:**
- Email provider (Resend, Postmark, SendGrid).
- Templates: order confirmation, shipping notification, password reset, welcome.
- Webhook handler so failures don't lose orders.

### 1.6 Admin authentication
**Where it's missing:** anyone with the URL can visit `/admin` and toggle inventory flags.
**What you need:**
- Add a server-side auth check in `app/admin/layout.tsx` that calls `redirect('/login')` for non-admin users. (The TODO is already in place at line 8.)
- Wire `assertAdmin()` in `lib/actions.ts` to a real session check (it's currently a `console.warn` stub).
- Add an `is_admin` (or `role`) column to the `customers` table.

### 1.7 Real product images
**Status:** 56 of 432 items have real images (Pokemon TCG from the public ptcg-assets repo). The other 376 use loremflickr placeholders.
**Options, ranked:**
1. **Clover image sync** — your POS likely has product photos already. Use the Clover Inventory API to pull `imageUrl` per item and feed it into `scripts/image_map.json`. Best long-term answer.
2. **Take your own photos** — most authentic but multi-day project.
3. **Vendor catalog feed** — Steel City / Blowout / Dave & Adam's would license you product photos; some have APIs.
4. **Curate by cluster** — the existing `image_map.json` mechanism already supports this; you can add entries by hand any time.

### 1.8 Real customer & order data in admin
**Where it's mocked:** `app/admin/orders/page.tsx` and `app/admin/customers/page.tsx` show hardcoded JSX tables. The recent-orders block on the dashboard and the order history on `/account` are also fake.
**What you need:** all three become server-component queries against the orders/customers tables once §1.2 lands.

### 1.9 Tax calculation
**Where it's missing:** checkout shows subtotal + shipping but no tax line. The Clover xlsx exports a 9.25% Windsor sales tax rate that's currently unused.
**What you need:**
- Server-side tax compute based on the shipping address.
- Show on the order summary and the receipt.
- Persist the tax amount on the order.
- For other jurisdictions: TaxJar / Avalara / Stripe Tax (whichever fits).

### 1.10 Required content pages
**Where they're missing:** Footer has `#` links for Shipping Policy, Returns & Refunds, Authenticity Guarantee, FAQ. Plus no Privacy Policy, Terms of Service, or Contact page.
**Why this is a launch blocker:** payment processors require T&Cs and a privacy policy. Most jurisdictions require returns/shipping policies to be published. Customers won't trust the site without them.

---

## TIER 2 — Need within the first month after launch

These don't strictly block launch but you'll regret deferring them.

### 2.1 Cart and want-list persistence
**Today:** both reset on every page refresh (in-memory only).
**Fix:** sync to localStorage for guests, sync to the `customers.cart` JSONB column for logged-in users.

### 2.2 Search that actually scales
**Today:** `ShopClient` does a `.filter()` over the full product array in the browser, matching name + description substring with no debounce.
**Fix:** for ≤1k products the current approach is OK with debouncing (`useDeferredValue`); past that, move search server-side. Postgres `tsvector` / `pg_trgm` extension is fine for ~5k–50k SKUs.

### 2.3 Pagination on `/shop`
**Today:** all 432 product cards render at once. 432 `<img>` tags = lots of DOM. At 5k products it'll be unusable.
**Fix:** URL-driven `?page=N` pagination (24 per page is the usual default), or "load more" with `useInfiniteQuery` once you have a real backend.

### 2.4 Stock decrement and "Add to cart" guard for out-of-stock
**Today:** the 124 out-of-stock items show an "Out of Stock" badge but the "Add to Cart" button is still clickable on the PDP.
**Fix:** guard `addToCart` in `CartContext` to reject OOS items; gray out the button on PDP/card.

### 2.5 Address book + saved cards
**Today:** every checkout requires re-entering shipping. No card-on-file.
**Fix:** `customer_addresses` table; default address picker on checkout; Clover Customer Vault for cards.

### 2.6 Real admin CRUD for products
**Today:** `InventoryTable` lets you toggle flags and edit name/desc/price/image. You cannot:
- Add a new product
- Delete a product (the action exists in `lib/actions.ts` but no UI)
- Upload a product photo (you have to paste a URL)
- Adjust stock quantity
- Bulk-edit
- Re-run the xlsx import from the admin UI

### 2.7 Order fulfillment workflow
**Today:** the Orders page has "Fulfill" / "View" buttons that do nothing.
**Fix:** state machine — Pending → Processing → Shipped → Delivered → (Returned). Each transition writes to `inventory_transactions` and sends an email.

### 2.8 Loyalty points
**Today:** the `User` type has `loyaltyPoints` and the account page displays it, but nothing awards or spends them.
**Fix:** award X points per dollar on order completion; redemption page; "Loyalty Store" section per the spec.

### 2.9 Coupon / discount codes
**Today:** no UI for it anywhere.
**Fix:** `coupons` table with code, type (percent/fixed), min_subtotal, valid_from/to; input on checkout.

### 2.10 Page-level metadata for SEO
**Today:** only the root layout has a title/description. Every PDP shows "Top Rated | Cards & Collectibles" in the tab.
**Fix:** add `generateMetadata` to `app/shop/[id]/page.tsx` so each product page has its own `<title>`, `description`, and `<meta property="og:image">`. Same for `/about`, `/shop`, `/admin` (noindex).

### 2.11 JSON-LD structured data
**Today:** missing.
**Fix:** emit `<script type="application/ld+json">` with `Product` schema on PDPs and `Organization` / `Store` on the root layout. Critical for Google Shopping and rich results.

### 2.12 `sitemap.xml` and `robots.txt`
**Today:** missing.
**Fix:** add `app/sitemap.ts` that emits one entry per product. Add `app/robots.ts`. Both are 30-line files.

### 2.13 Error tracking
**Today:** none. A 500 in production is silent.
**Fix:** Sentry, Highlight, or Vercel Error Tracking. Add `app/global-error.tsx` to capture render errors.

### 2.14 Real shipping rates
**Today:** flat $9.99 / free over $300.
**Fix:** EasyPost / Shippo / direct carrier APIs once you have weights/dimensions on products.

### 2.15 Account creation (signup route)
**Today:** the login page no longer has a broken "Sign up" link (I removed it), but there's still no `/signup` route.
**Fix:** create `app/signup/page.tsx` once §1.1 lands.

---

## TIER 3 — Solid hygiene within the first quarter

### 3.1 Tests
- Unit tests for `lib/`, `contexts/` (Vitest is fine).
- E2E for the critical paths (homepage load, search, add-to-cart, checkout success, admin toggle). Playwright matches the version-16 docs' `@next/playwright` reference.

### 3.2 CI/CD
- GitHub Actions running `eslint`, `tsc --noEmit`, `vitest`, `playwright` on every PR.
- Preview deployments per PR (Vercel/Netlify both do this for free).
- Required status checks before merging to `main`.

### 3.3 Security headers
- `Content-Security-Policy` (framer-motion needs `unsafe-inline` styles unless you go strict-CSP with nonces).
- `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- See `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.

### 3.4 Input validation
- Adopt zod (most idiomatic for Next 16).
- Every Server Action validates its inputs.
- Every API route validates its body.
- Forms parse with zod on the client.

### 3.5 Accessibility
- `CartDrawer` becomes `<dialog>` with focus trap + Escape close (audit item §4.2).
- All icon buttons get `aria-label` (audit §4.1).
- Skip-to-content link in the root layout.
- Color contrast pass on glass panels (audit §4.3).
- Dropdown in Navbar is hover-only — add click/keyboard activation.

### 3.6 Real `next/font/google`
**Where it's blocked:** the sandbox can't reach `fonts.googleapis.com` at build, so I left the `@import` in `globals.css` and a `TODO(perf)` block in `layout.tsx`. On your machine, the snippet in that TODO will Just Work.

### 3.7 React Compiler
**Today:** not enabled. Free perf win in Next.js 16 once the `ToastContext` memoization cleanup is verified by the compiler (it passes lint now).
**Fix:** set `reactCompiler: true` in `next.config.ts`, install `babel-plugin-react-compiler`.

### 3.8 `unstable_instant` on the PDP
The PDP is now a Server Component (the structural prereq), so adding `export const unstable_instant = { prefetch: 'static' }` would unlock instant navigation between PDPs. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

### 3.9 Cache strategy for inventory reads
**Today:** `getProducts()` is wrapped in `React.cache()` — dedupes within a single request, doesn't cache across requests.
**Fix:** wrap with `cacheTag('products', cacheLife: 'minutes')`, call `revalidateTag('products', 'max')` from `lib/actions.ts` mutations.

### 3.10 Observability
- Vercel Analytics (or Plausible / PostHog).
- LogTail or Axiom for server logs.
- Uptime monitor (Better Stack, UptimeRobot).

---

## TIER 4 — Polish

### 4.1 Loading and error UI
- `app/loading.tsx` for the root.
- `app/shop/loading.tsx` with skeleton cards.
- `app/error.tsx` and `app/global-error.tsx`.

### 4.2 Optimistic UI
- Admin inventory toggles flip immediately, then reconcile.
- Cart updates use `useOptimistic` (React 19).

### 4.3 Image upload UI in admin
- Drop a file → uploads to Supabase Storage → fills the URL.

### 4.4 "Similar items" on PDP
- 4 products from the same `(category, subCategory)` cluster at the bottom.

### 4.5 Empty states with action
- "No products found" → "Clear filters" button.
- Empty cart → featured items inline.
- Empty want-list → top-rated picks.

### 4.6 Mobile dropdown menu
- The Shop dropdown is hover-only on desktop. On mobile it's hidden inside the mobile menu, which works, but the dropdown items collapse the same as the top-level — they don't reveal sub-items.

### 4.7 Search UX
- 250 ms debounce.
- Clear button (×).
- "X results for 'pokemon'" header.
- Autocomplete suggestions.

### 4.8 Better 404
- Suggest similar products by name match if `/shop/[bogusId]` was searched.

### 4.9 Gift card SKU
- The Clover xlsx had a "Gift card" item that the ingestion skips because it has no price. Real implementation: it's a variable-price item with its own checkout flow.

### 4.10 Pre-order workflow
- Pre-orders show a release date.
- Customer is charged on release, not on order.
- Separate fulfillment queue.

### 4.11 News & Events
- Homepage has three hardcoded event cards. Move to a `news` table.

### 4.12 Store locator / hours
- Homepage map is a static PNG.
- Real Google Maps embed.
- Store hours.
- Contact form.

---

## What's in good shape

So you have an accurate picture of what's *done*:

- App Router structure is correct for Next.js 16. Async `params` handled. No deprecated APIs in use.
- All 432 products from the xlsx ingest cleanly, with stable IDs (Clover IDs), inferred categories for the 13 rows with missing data, typo fixes, year normalization (vintage and modern), out-of-stock detection.
- Re-importing is a one-liner (`python3 scripts/ingest_inventory.py`) and is idempotent. The override file (`scripts/image_map.json`) preserves any per-product image URLs across re-imports.
- Server / Client component boundary is clean. Types live in `lib/types.ts`. Reads via `lib/db.ts` (`server-only`-guarded). Mutations in `lib/actions.ts` behind an `assertAdmin()` stub.
- Cart and want-list contexts no longer call setState across components during render — the React 19 warning is fixed.
- ESLint clean. `next build` produces 13 routes (12 static, 1 dynamic).
- `<img>` → `next/image` everywhere; `images.remotePatterns` configured.
- Admin shell deduplicated into `app/admin/layout.tsx`.
- ScrollReveal animations no longer replay on every scroll.

---

## Suggested order of operations

If I were starting Monday morning:

**Week 1:** §1.1 Supabase Auth → §1.2 Supabase tables → §1.6 admin auth.
**Week 2:** §1.3 Clover iframe + §1.4 order persistence + §1.5 email.
**Week 3:** §1.9 tax + §1.10 policy pages (these can be drafted while engineering works).
**Week 4:** §1.7 image pipeline (start the Clover sync) + §1.8 swap admin pages to real queries.

That's the minimum-viable launch (~4 weeks). Tier 2 items become the next two months.

---

## Sources

- Built atop the earlier audit in `AUDIT.md` (in this folder).
- Specification: `docs/SPECIFICATION.md`.
- Phased roadmap: `docs/FRONTEND_BACKEND_TODO.md` (covers Phase 4 Supabase / Phase 5 Clover).
- Next.js 16 guides under `node_modules/next/dist/docs/01-app/`.
