# Top Rated — Admin Portal Audit

**Date:** June 20, 2026 · **Reviewer:** Claude · **Scope:** `/admin/*` only — functionality gaps + usability from the shop owner's perspective
**Live site:** https://topratedcc.netlify.app/admin · **Repo:** https://github.com/HackingHobbit/TopRated
**Method:** read every file under `app/admin/`, `components/InventoryTable.tsx`, `components/ProductEditModal.tsx`, `lib/actions.ts`, `lib/supabase/server.ts`; rendered each page in mock mode and inspected the live DOM.

---

## TL;DR

The admin portal is **one working page (Inventory) wrapped in three mockups (Dashboard, Orders, Customers).** The shell — shared layout, sticky sidebar, active-link highlighting, role gate — is genuinely good and production-shaped. But of the four nav items, three render hardcoded JSX with buttons that do nothing, and the one real page (Inventory) has serious usability problems at the shop's actual catalog size (432 products).

The single most important usability fact: **the inventory page renders all 432 rows at once** — a 39,000-pixel-tall page with ~2,167 buttons, no pagination, no search, no sort, no filter. An owner trying to find one product to mark out-of-stock has to Ctrl-F the browser.

---

## What works well (don't break these)

- **Shared layout (`app/admin/layout.tsx`).** Sidebar lives in the layout, not duplicated per page. Clean.
- **Role gate is correctly placed.** The layout does the auth check server-side and `redirect()`s before any admin child renders. When Supabase is configured, non-admins go to `/account`, logged-out users go to `/login?redirect=/admin`. The structure is right; it just isn't active yet (see 1.1).
- **Active-nav highlighting (`AdminNav.tsx`)** uses `usePathname()` with a sensible exact-match-for-dashboard / prefix-match-for-children rule, and sets `aria-current="page"`. Good a11y default.
- **Server Action security shape (`lib/actions.ts`)** is correct: `'use server'`, every mutation calls `assertAdmin()` first, and in production-without-Supabase it *throws* rather than allowing the write. Dual Supabase/JSON backend with column mapping is already built.
- **Inventory toggles give optimistic-ish feedback** — the row dims (`loadingId`) during the await, and reconciles with the server's returned row.

---

## TIER 1 — Broken or absent; blocks real admin use

### 1.1 No active auth gate in the deployed site — ✅ FIXED (fail-safe), full fix pending Supabase env vars
**Original finding:** `app/admin/layout.tsx` only ran the role check `if (supabaseConfigured())`. The live Netlify site has **no Supabase env vars**, so the gate was skipped and `/admin` rendered to anyone with the URL.

**Severity correction:** the portal was *viewable* but not *mutable* on the live site. The inventory mutations (`updateProduct`/`deleteProduct`) call `assertAdmin()`, which **throws** in production when Supabase isn't configured (`lib/actions.ts:46`). So flag toggles already errored out on the live site — the earlier draft of this audit overstated it as "anyone can toggle inventory flags." What was actually exposed was read-only browsing of the admin shell (mostly hardcoded mock data, plus the product list that's already public on the storefront).

**Fix applied (June 20):** the layout now fails safe — in production with Supabase unconfigured it calls `notFound()` instead of rendering open, so the live `/admin` returns a 404 until a real auth backend is wired up. Verified: a production build without env vars prerenders `/admin` as the not-found page; the dev mock demo is unaffected.

**Remaining work (you):** set the Supabase env vars on Netlify so the route comes back online *gated* rather than 404 — see the new §7 in `SUPABASE_SETUP.md`. This is the same item as `PRODUCTION_AUDIT.md` §1.6.

### 1.2 Inventory: all 432 rows render at once — no pagination, search, sort, or filter
`app/admin/inventory/page.tsx:7` calls `getProducts()` with no limit and passes the entire array to `InventoryTable`, which `.map()`s every row. Measured on the live DOM: **432 rows, ~2,167 buttons, body height 39,333px.** There is no search box, no column sort, no category filter, no pagination on this page (the two `<input>`s on the page are the global navbar search, which doesn't filter the table).
**Impact:** the core daily task — "find product X and change something" — requires scrolling a 39k-pixel page or using browser find. This is the #1 usability problem.
**Fix direction:** URL-driven pagination (`?page=N`, 25–50/page) + a server-side or client-side search-by-name box + sortable Name/Price/Category headers + a category/flag filter. `PRODUCTION_AUDIT.md` §2.2/§2.3 already flags the storefront equivalents; admin needs its own.

### 1.3 Three of the four flags that drive the storefront have NO admin UI
The `Product` type has 7 business flags. The inventory table only exposes toggles for **4**: `isSale`, `isFeatured`, `isNewRelease`, `isOutOfStock` (`InventoryTable.tsx:55-74`). The `ProductEditModal` edits **none** of them (only name/description/price/image, `ProductEditModal.tsx:15-20`). That leaves **`isPreOrder`, `isLimited`, and `isSealed` unsettable from anywhere in the admin.**
**Why this matters concretely:**
- The homepage renders a whole **Pre-Orders** section off `isPreOrder` — but an owner can't flag a product as a pre-order.
- The hero CTA / shop filter keys off **Sealed** (`isSealed`) — not togglable.
- `isLimited` drives a product badge — not togglable.
**Fix direction:** add the three missing toggle columns (the table is already too wide — see 1.4 — so this likely belongs in an expanded edit modal rather than more columns).

### 1.4 Inventory table overflows horizontally; toggle buttons are off-screen
With 9 columns (Name, Category, SubCategory, Price, Sale, Featured, New, OOS, Actions) the table is wider than the content area minus the 250px sidebar. On a standard viewport the Price column is already clipping and the four toggle columns + Edit button sit in horizontal-scroll territory. The wrapper has `overflow-x: auto` so it's reachable, but an owner has to scroll right on every row to toggle OOS — the most common action.
**Fix direction:** prioritize columns (Name, Price, OOS toggle, Edit visible; rest behind the edit modal or a row-expand), or drop Category/SubCategory to a single combined column, or move all flag editing into the modal and keep the table to Name / Price / Stock / Edit.

### 1.5 No "Add Product" anywhere
There is no UI to create a product. Inventory only comes in via the Python xlsx ingest (`scripts/ingest_inventory.py`). An owner who gets a new single in the case has no way to list it without re-running a script on a developer's machine.
**Fix direction:** an "Add Product" button → the same modal in create mode → a `createProduct` Server Action (sibling to the existing `updateProduct`/`deleteProduct`).

### 1.6 Delete exists in the backend but has no UI
`lib/actions.ts:149 deleteProduct()` is fully implemented (Supabase + JSON paths) but **nothing in the UI calls it.** Owners can't remove a discontinued product.
**Fix direction:** a delete button in the row or modal with a confirm step.

### 1.7 Orders page is 100% hardcoded
`app/admin/orders/page.tsx` is four literal `<tr>`s (TR-10495…TR-10492, dated May 2026). The search box has no handler, **Export CSV does nothing, Fulfill does nothing, View does nothing.** There is no orders table in the data model yet, so there's nothing real to show.
**Fix direction:** depends on `PRODUCTION_AUDIT.md` §1.4 (persist orders). Once orders exist, this becomes a server-component query + a real fulfillment state machine (§2.7 there).

### 1.8 Customers page is 100% hardcoded
`app/admin/customers/page.tsx:3` is a `MOCK_CUSTOMERS` array of four people. **Export CSV and View Profile do nothing.** No real customer/profile table is wired in.
**Fix direction:** server-component query against the `customers`/`profiles` table once auth lands.

### 1.9 Dashboard metrics are fabricated literals
`app/admin/page.tsx:26-110` — Total Sales `$4,295.50`, New Orders `24`, Low Stock `12`, Active Customers `1,204`, the `+12% / +5% / +8` trends, and the entire Recent Activity table are hardcoded. (The date is now live — good, that was fixed.) An owner reading this dashboard is reading fiction; the numbers never change.
**Fix direction:** wire to real aggregates after orders/customers persist. Until then, consider labeling them "Demo data" so they're not mistaken for real figures.

---

## TIER 2 — Real usability friction on the one working page

### 2.1 Destructive-feeling actions use `alert()` and `console.error`
Both `InventoryTable.tsx:25` and `ProductEditModal.tsx:35` surface failures with a raw browser `alert('Failed to…')`. The app already has a `ToastContext` used elsewhere — admin errors should go through it for consistency and to avoid the blocking modal dialog.

### 2.2 No stock-quantity management
The `Product` type has no `quantity` field, so "out of stock" is a manual boolean toggle rather than a count. An owner can't see or set how many of an item they have. `PRODUCTION_AUDIT.md` §1.2 calls for a `quantity` column; the admin needs an input for it.

### 2.3 No category / subcategory editing
Neither the table nor the modal lets you change a product's `category`/`subCategory`. If the ingest mis-categorized an item (the audit notes 13 rows had inferred categories), the only fix is editing `image_map.json`/`db.json` by hand and re-running the script.

### 2.4 Image management is paste-a-URL only
`ProductEditModal.tsx:80-87` is a bare `type="url"` input. `PRODUCTION_AUDIT.md` §4.3 wants a Supabase Storage upload. Today an owner must host an image elsewhere and paste the link — and 376/432 products still point at `loremflickr` placeholders they have no easy way to replace in bulk.

### 2.5 Editing in mock mode silently mutates the committed `data/db.json`
In fallback mode `updateProduct`/`deleteProduct` write to `data/db.json` on disk (`lib/actions.ts:33,144,163`). On the live Netlify site this fails (read-only FS, and prod throws via `assertAdmin`), but **locally, clicking toggles in the demo edits a git-tracked file** — easy to accidentally commit. Worth a note for anyone demoing.

### 2.6 No bulk actions
Common owner tasks — "mark this whole set as sale," "clear all pre-order flags after release" — require per-row clicking across 432 rows. No select-all / bulk-toggle.

### 2.7 No confirmation or undo on toggles
Flag toggles fire immediately on click against the server. A misclick on the wrong row's OOS flag is invisible (you'd have to notice the storefront changed). Combined with 1.4 (scroll-right to reach the buttons), mis-toggles are likely.

---

## TIER 3 — Polish

- **3.1 Mobile.** The admin layout is a flex row with a fixed 250px sidebar; on a phone the sidebar + an overflowing table is unusable. No responsive treatment for `/admin`.
- **3.2 Empty / loading states.** No `loading.tsx` for the inventory fetch; no empty state if a future filter returns nothing. The table just pops in.
- **3.3 The two "Export CSV" buttons** (Orders, Customers) imply a feature that doesn't exist. Either build it (a few lines for a server-generated CSV) or hide it until the data is real.
- **3.4 No breadcrumb / page context** beyond the sidebar highlight. Fine for 4 pages; revisit if the portal grows.
- **3.5 Sidebar "Admin Portal" heading** isn't a link home; minor.

---

## Suggested order of operations

1. **Lock the door (1.1).** Until the Supabase gate is live, password-protect `/admin` at the Netlify edge or keep the URL private. Highest risk, smallest effort.
2. **Make Inventory usable at 432 rows (1.2, 1.4).** Pagination + search + a sane column set. This is the page owners will actually live in.
3. **Close the flag gap (1.3).** Move all 7 flags into the edit modal so Pre-Order / Sealed / Limited are reachable; trim the table.
4. **Add create + delete UI (1.5, 1.6).** The delete action already exists; wiring a button is cheap. Add-product unblocks day-to-day listing.
5. **Everything else (Orders, Customers, Dashboard) is downstream of the data model** — it can't be real until `PRODUCTION_AUDIT.md` §1.2/§1.4 (Supabase tables + order persistence) land. Until then, label the fake numbers as demo data so they don't mislead.

---

## Sources

- Code read: `app/admin/{layout,page,AdminNav}.tsx`, `app/admin/{inventory,orders,customers}/page.tsx`, `app/admin/page.module.css`, `app/admin/inventory/page.module.css`, `components/InventoryTable.tsx`, `components/ProductEditModal.tsx`, `lib/actions.ts`, `lib/supabase/server.ts`.
- Rendered in mock mode (`localStorage.mockAuth = true`); live DOM measured: 432 rows, ~2,167 buttons, 39,333px page height, no pagination.
- Builds on `AUDIT.md` (May 21) and `PRODUCTION_AUDIT.md` (May 25) in this repo — cross-referenced where items overlap.
