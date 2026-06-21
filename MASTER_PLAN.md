# Top Rated — Master Completion Plan & Full-Site Audit

**Date:** June 20, 2026
**Live site:** https://topratedcc.netlify.app · **Repo:** https://github.com/HackingHobbit/TopRated
**Stack:** Next.js 16.2.6 (App Router, Turbopack) · React 19.2 · TypeScript · CSS Modules · Supabase (Postgres + Auth) · Netlify

This is the single source of truth for finishing the site: what's real vs. filler, what's clunky, what's missing, and the phased plan to take it from "impressive demo running on real infrastructure" to "a store that takes money and is a joy to run." It supersedes the forward-looking sections of `AUDIT.md` and `PRODUCTION_AUDIT.md` (both still valid for historical context) and folds in the new requirements: real admin product CRUD, and a dedicated, mobile-first **Singles** inventory with photo capture.

---

## 0. Where the site actually stands today (updated June 21, 2026)

**Real and live:**
- Supabase Auth (email/password), real sessions, server-side admin gate, RLS at the database.
- 432 products in Postgres, served to the storefront and the admin inventory table.
- Admin can toggle 4 flags and edit name/description/price/image-URL, writing to Postgres.
- Admin-only "Admin" button in the navbar.
- Customer signup creates an `auth.users` + `profiles` row.
- **User & staff administration** (`/admin/users`) — list/search, role change (with self-lockout + last-admin guards), profile edit, password reset, and create/delete login accounts (service-role key wired on local + Netlify). *(§6 — shipped & verified)*
- **Custom Inventory / singles** (`/admin/singles`) — full CRUD for individual cards, grouped by category, with multi-photo upload to Supabase Storage and **rear-camera capture on mobile**. *(§5 / Phase D — shipped & verified)*
- **Role-escalation hole is closed** — migration 0002's guard trigger blocks non-admins from changing their own role. *(Phase 0 — done)*
- **Checkout persists real orders** — `placeOrder` writes `orders` + `order_items` + `inventory_transactions`, re-priced server-side, with a real order number. *(Phase A1 — done; payment is still mocked.)*
- **Out-of-stock is enforced** — OOS items can't be added (PDP, card, and cart). *(Phase B5 — done.)*
- **Admin Customers page is real** — profiles + order aggregates. *(Phase B6 — done.)*

**Still a prototype underneath the polish:**
- Checkout collects card fields but takes **no real payment** (Clover, A2) and adds **no tax** (A3); orders save as status `pending`.
- The account order history, admin dashboard metrics, the admin Orders page, and the homepage events are still hardcoded literals.
- The *sealed-product* inventory page still can't add/delete products, set quantity, or upload photos (the singles flow can — the `<PhotoUploader>` is now reusable to bring this to the main inventory).
- 376 of 432 product images are still `loremflickr` placeholders.
- Cart and want-list evaporate on refresh.

The visual quality is high, which is exactly why the remaining filler is dangerous: it looks done. Section 1 inventories every place that is *not*.

---

## 1. Filler / preview content (what is fake right now)

Status legend: ✅ fixed · ⬜ still filler. Severity: 🔴 customer-visible/launch-blocking · 🟡 admin-visible · ⚪ cosmetic. (File line numbers are approximate — they've shifted as code changed.)

| Status | Area | Notes | Sev |
|---|---|---|---|
| ✅ | **Order number** | Real server-generated number from a persisted order (`lib/orderActions.ts`). | 🔴 |
| ✅ | **Order persistence** | `placeOrder` writes `orders` + `order_items` + `inventory_transactions`, re-priced server-side. | 🔴 |
| ✅ | **PDP stock status** | Reflects `isOutOfStock`; OOS add-to-cart blocked on PDP, card, and cart. | 🔴 |
| ✅ | **Admin Customers page** | Real `profiles` + order aggregates (count/spend/tier) via `getCustomers()`. | 🟡 |
| ✅ | **Supabase image host** | Added `*.supabase.co` to `next.config` `remotePatterns` so photographed singles render on the storefront (was a latent crash). | 🔴 |
| ⬜ | **Checkout payment** | Still "Payment Method (Mock)"; card fields collected but no real charge. → Phase A2 (Clover). | 🔴 |
| ⬜ | **Tax** | Stored as 0; no tax line in the summary. → Phase A3. | 🔴 |
| ⬜ | **Account → Order History** | Hardcoded "Order #TR-10492…". → Phase A5 (now unblocked). | 🔴 |
| ⬜ | **Account → loyalty tier** | "Gold Tier" badge hardcoded regardless of points. | 🟡 |
| ⬜ | **Account → Settings** | "will be implemented in Phase 4" placeholder. | 🟡 |
| ⬜ | **Admin dashboard metrics** | `$4,295.50`, `24`, `12`, `1,204`, … all literals (`app/admin/page.tsx`). → Phase B1. | 🟡 |
| ⬜ | **Admin dashboard "Recent Activity"** | Hardcoded TR-10495/10494/10493 rows. → Phase B1. | 🟡 |
| ⬜ | **Admin Orders page** | Entire table hardcoded; Fulfill/View/Export/search are no-ops. → Phase B2. | 🟡 |
| ⬜ | **PDP guarantee box** | Static marketing copy (confirm it's true). | ⚪ |
| ⬜ | **Homepage events** | 3 hardcoded event cards (Friday Night Magic, etc.). | ⚪ |
| ⬜ | **Store address / map** | "123 Collector's Avenue, Hobby City, CA 90210"; static `map.png`; generic Get-Directions link. | 🔴 (real address) |
| ⬜ | **Footer policy/social links** | All `href="#"`. | 🔴 (legal) |
| ⬜ | **Product images** | 376 of 432 are `loremflickr` placeholders. | 🔴 |
| ⬜ | **Hero "Browse TCG" link** | `?subCategory=Pok%C3%A9mon` matches nothing (DB subcategory is `TCG`, Pokémon is a search term) → "No products found". | 🟡 (bug) |
| ⬜ | **Content pages** | No Privacy, Terms, Returns, Shipping, FAQ, Contact pages. | 🔴 (legal) |

---

## 2. Site & workflow usability

### Storefront
- **No pagination** — `/shop` renders all 432 `ProductCard`s at once (`app/shop/ShopClient.tsx:161-168`). Heavy DOM, slow on mobile, gets worse as inventory grows. **Fix:** URL-driven `?page=N` (24/page) or infinite scroll.
- **Client-side search/filter, no debounce** — fine at 432, won't scale; every keystroke re-filters the full array (`ShopClient.tsx:41-67`). **Fix:** `useDeferredValue` now; move to Postgres `tsvector`/`pg_trgm` past ~5k SKUs.
- ✅ **Out-of-stock purchasing — FIXED.** `addToCart` rejects OOS items, the card/PDP buttons disable, and the PDP status reflects `isOutOfStock`.
- **Filter taxonomy mismatch** — the hero/sub-nav mix `category`, `subCategory`, and `search`; some combinations (e.g. `?subCategory=Pokémon`) match nothing. **Fix:** one consistent filter model; verify every nav link resolves to ≥1 product.

### Cart & checkout
- **Cart and want-list are in-memory only** — `CartContext`/`WantListContext` use `useState` with no persistence (`contexts/CartContext.tsx:29`). A refresh empties the cart mid-shop. **Fix:** localStorage for guests; `public.carts`/`public.want_lists` (tables already exist in the schema) for logged-in users.
- **3-item limit & free-shipping bar work well** — keep.
- **Checkout is a dead end** — collects shipping + (discarded) card data and fakes success. This is the single biggest gap (see §7 Phase A).

### Admin
- **No pagination/search on the 432-row inventory table** — the whole list renders and ships to the client (`app/admin/inventory/page.tsx:7`, `InventoryTable.tsx`). **Fix:** server-side paginated/searchable table.
- **Dead buttons** across Orders/Customers erode trust in the tool (see §1).

---

## 3. User experience

- **No route-level loading or error UI** — only `/shop` has a Suspense boundary. A thrown error anywhere falls to the framework default. **Fix:** add `app/loading.tsx`, `app/error.tsx`, `app/global-error.tsx`, and per-route skeletons.
- **Login redirect timing** — the client-side post-login `router.push` is occasionally swallowed (seen during verification); harmless but worth making deterministic by redirecting on the auth-state change.
- **Accessibility gaps** (carried from `AUDIT.md` §4): cart drawer isn't a real `<dialog>` (no focus trap / Escape), some icon buttons still unlabeled, glass-panel contrast unverified against WCAG AA. **Fix:** a dedicated a11y pass with Lighthouse + keyboard testing.
- **SEO is bare** — only the root layout has metadata; no per-PDP `generateMetadata`, no JSON-LD `Product`, no `sitemap.ts`/`robots.ts`. **Fix:** add these before launch for Google Shopping eligibility.
- **No transactional email** — signup verification relies on Supabase's rate-limited built-in sender; order confirmations don't exist. **Fix:** custom SMTP (Resend/Postmark) — see the standing radar item.
- **Images** — `next/image` is wired and `remotePatterns` configured, but placeholder hosts (`loremflickr`) flicker and look untrustworthy on a store selling authenticity. Real photography is a credibility issue, not just cosmetic.

---

## 4. Admin: add & edit products (current vs. required)

**Today** (`components/InventoryTable.tsx`, `ProductEditModal.tsx`):
- ✅ Toggle `isSale`, `isFeatured`, `isNewRelease`, `isOutOfStock`
- ✅ Edit `name`, `description`, `price`, `image` (URL paste only)
- ❌ **Add a new product** — no UI (no create path at all)
- ❌ **Delete** — `deleteProduct()` exists in `lib/actions.ts:149` but has no button
- ❌ Edit `isLimited`, `isPreOrder`, `isSealed`, `category`/`subCategory`
- ❌ Stock **quantity** (`products.quantity` exists in schema, unused in UI)
- ❌ `sku` / `barcode`
- ❌ **Image upload** (only URL)
- ❌ Bulk edit / CSV
- ❌ Pagination / search on the table

**Required build (Phase C):** *(note: the singles work already shipped all of these for individual cards — the `<PhotoUploader>`, the `product-images` Storage bucket, and `createSingle`/`updateSingle`/`deleteSingle`. Phase C is now mostly "apply the same patterns to the main/sealed inventory page.")*
1. **"Add Product" flow** — a create form (reusing an upgraded `ProductEditModal` or the singles `SingleForm`) calling a new `createProduct()` server action (gated by `assertAdmin`, writing to Postgres, `revalidateTag`).
2. **Delete with confirmation** — wire the existing `deleteProduct()` to a guarded button (typed confirmation; never a one-click destroy).
3. **Full field coverage** — all flags, category/subcategory pickers (from the `categories` table), quantity, sku/barcode.
4. **Image upload** (shared with §5) — drag-drop on desktop, file picker, replacing URL-paste (URL kept as a fallback/advanced option).
5. **Optimistic UI** — toggles flip instantly then reconcile (`useOptimistic`).
6. **Server-side paginated + searchable table** — stop shipping all rows to the client.

---

## 5. Singles inventory + photo capture (the priority feature) — ✅ SHIPPED (June 21)

> Built and live: migration 0002, the `product-images` Storage bucket + RLS, `<PhotoUploader>` (drag-drop + file picker + mobile rear-camera capture + client compression), and full CRUD at `/admin/singles` grouped by category. Verified end-to-end (create → companion row → delete; admin upload → public read → delete). The remaining follow-up is storefront-side: show grade/condition/cert and the photo gallery on the single's public PDP. Original spec retained below for reference.

**Goal:** a dedicated, *delightfully easy* workflow for listing individual cards — where the bottleneck is photographing the card, and the app makes that the fast part. Optimized for a phone in one hand and a card in the other.

### Why singles are different from sealed product
Sealed boxes are catalog items (SKU → many identical units). **Singles are one-of-one**: each has its own photo(s), condition, and often a grade. The current flat `products` table doesn't capture this. Singles need: front/back photos, player/character, set, year, condition (raw) or grade + cert # (graded: PSA/BGS/SGC/CGC), and quantity is almost always 1.

### Data model (new migration `0002_singles.sql`)
Add singles-specific columns to `products` (nullable, so sealed rows are unaffected), or a `single_details` companion table keyed by `product_id`. Recommended: a companion table.
```
public.single_details(
  product_id text PK references products(id) on delete cascade,
  player_or_subject text, card_set text, year int,
  card_number text, condition text,           -- 'raw' | 'PSA 10' | 'BGS 9.5' | ...
  grader text, cert_number text,
  is_graded boolean default false
)
public.product_images(                          -- multiple photos per product
  id uuid PK default gen_random_uuid(),
  product_id text references products(id) on delete cascade,
  url text not null, position int default 0,
  created_at timestamptz default now()
)
```
Plus a **Supabase Storage bucket** `product-images` with RLS: public read, admin-only write. (No storage exists today — this is net-new infra.)

### Photo upload — the core UX
- **Desktop:** drag-and-drop zone + file picker; multi-file; instant thumbnail previews; reorder; set primary.
- **Mobile (critical):** a capture button using
  ```html
  <input type="file" accept="image/*" capture="environment" multiple />
  ```
  `capture="environment"` opens the **rear camera directly** on iOS/Android, so the admin taps → shoots the card → it uploads immediately. Front + back in two taps.
- **Pipeline:** client compresses/resizes (e.g. `browser-image-compression`) → `supabase.storage.from('product-images').upload()` → returns public URL → inserted into `product_images` and set as the product `image`. Show per-file progress and a clear success state.
- **Offline-tolerant niceness (stretch):** queue uploads and retry, so a spotty in-store connection doesn't lose a photo.

### Singles admin section (`/admin/singles`)
- A **"Quick Add Single"** form built mobile-first: photo capture at the top, then the few fields that matter (subject, set, year, condition/grade, price, qty=1 default). Submit creates the product (`category` = its sport/TCG, `isSealed=false`) + `single_details` + images in one server action.
- A **list view** filtered to singles, with the same upload affordance for adding/replacing photos on existing cards.
- **Graded-card helper (stretch):** paste a PSA/BGS cert number → prefill subject/set/year/grade.

### Storefront surfacing
- A **Singles** entry in the shop taxonomy (filter `isSealed=false`), and singles PDPs that show the extra fields (grade, cert, condition) and the multi-photo gallery (front/back).

This feature spans schema + storage + a new server action + a new admin route + a reusable `<PhotoUploader>` component. It's the largest single workstream and is scheduled as its own phase (§7 Phase D).

---

## 6. User & staff administration (CRUD + roles) — ✅ SHIPPED (June 21)

> Built and live at `/admin/users`: list/search, role change (with self-lockout + last-admin guards), profile edit, password reset, and create/delete login accounts via the server-only service-role client (key wired on local + Netlify). Verified end-to-end (created a test account, then deleted it). Not yet built: an audit log of admin actions, and an optional limited `staff` tier. Original spec retained below.

### ✅ RESOLVED — was: live privilege-escalation hole
The RLS policy `"profiles self update"` (`supabase/migrations/0001_init.sql:269`) is:
```sql
create policy "profiles self update" on public.profiles for update using (id = auth.uid());
```
With no `WITH CHECK` and no column restriction, an authenticated user can update **any column of their own row — including `role`**. A customer can open the browser console and run `supabase.from('profiles').update({ role: 'admin' }).eq('id', <their id>)`, reload, and reach `/admin`. This is live on the production database.
**Fix (do this before anything else here):** stop non-admins from changing privileged columns. Cleanest is a `BEFORE UPDATE` trigger that rejects a `role`/`loyalty_points` change unless `public.is_admin()`:
```sql
create or replace function public.guard_profile_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role <> old.role or new.loyalty_points <> old.loyalty_points)
     and not public.is_admin() then
    raise exception 'Not authorized to change role or loyalty_points';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged before update on public.profiles
  for each row execute function public.guard_profile_privileged_cols();
```

### What "manage users" needs
- **List & search** all users (customers + staff) from `profiles` (admins already have RLS read access).
- **View** a user: profile, order history, loyalty points, addresses.
- **Edit** profile fields (name, loyalty points, notes).
- **Role management** — promote/demote between `customer` and `admin`, with guardrails: an admin can't strip their *own* admin (self-lockout), and the system must never drop to **zero** admins.
- **Create staff/admin accounts** directly from the panel.
- **Deactivate / ban / delete** accounts.
- **Trigger password-reset** emails.
- **Audit log** — who changed whose role/account, and when.

### Technical reality (important)
- Reading profiles and changing `role` work with the admin's normal cookie session via the `profiles admin update` RLS policy — once the trigger above is in place, only admins can do it.
- **Creating, deleting, or banning login accounts requires the Supabase Admin API** (`auth.admin.createUser` / `deleteUser` / `updateUserById`), which needs the **service_role / secret key** and must run **server-side only** — a dedicated service-role client, never shipped to the browser, called from `assertAdmin`-gated server actions. This is net-new infra: today the secret key isn't used by the app at all.
- The schema's `role` CHECK allows only `customer`/`admin`. If you want tiered staff (e.g. a limited `staff` role that can manage inventory but not users), widen the CHECK and the `is_admin()`/gate logic.

### Build (folds into Phase B, after the urgent trigger fix)
A `/admin/users` section (or the upgraded `/admin/customers`): searchable user table → detail view → edit / change-role / deactivate / reset-password, plus an "Add staff member" flow. Backed by server actions — role/profile edits via the session client; account create/delete/ban via the server-only service-role client; every action gated and audit-logged.

---

## 7. The master plan — phased execution

Each phase ends in something testable and deployable. Phases A–C are launch-blocking; D is the priority feature; E is post-launch hardening.

> **Progress (June 21, 2026):** ✅ **Phase 0** · ✅ **Phase D** (singles + photos) · ✅ **Phase B-3** (user/staff admin) · ✅ **Phase A-1** (order persistence) · ✅ **Phase B-5** (stock guard) · ✅ **Phase B-6** (real Customers page). **Next:** Phase A-2/3/4 (Clover payments, tax, email — payments/email need external accounts), A-5 (account order history, now unblocked), then Phase C and E.

### Phase 0 — Immediate security fix — ✅ DONE (June 21)
Migration `0002` applied; the `profiles` guard trigger blocks non-admin role/loyalty changes. Live-verified.

### Phase A — Make it transact (highest priority — IN PROGRESS)
1. ✅ **DONE (June 21)** — **Order persistence**: checkout calls `placeOrder` (`lib/orderActions.ts`), which re-prices from the DB server-side, writes `orders` + `order_items` + `inventory_transactions`, links the customer when logged in, decrements stock (floored), and returns a real order number. Verified end-to-end (order TR-…, correct totals, line-item DB prices). *(Stock is NOT auto-flipped to out-of-stock yet — seeded quantities are unreliable; that waits for real quantities. Orders are intentionally not hard-deletable — no RLS delete policy; cancel/refund via status instead.)*
2. **Clover payment** — hosted iframe tokenization → charge → webhook for `payment.success/failed`; idempotency keys; `/checkout/canceled` route. Card data never touches the server. *(NEXT external dep: needs a Clover account + keys. Orders currently persist as status `pending`.)*
3. **Tax** — server-side calc from shipping address (the Clover export carries a 9.25% Windsor rate); show + persist it. *(currently stored as 0.)*
4. **Transactional email** — Resend/Postmark SMTP; order confirmation + signup verification (also fixes the standing email radar item).
5. **Account order history** — replace the hardcoded card with a real query of the user's `orders`. *(unblocked now that orders persist.)*

### Phase B — Truth in the admin & account UI + user administration
1. Wire **admin dashboard** metrics + "Recent Activity" to real aggregate queries.
2. Wire **admin Orders** to `orders` (+ a real fulfillment state machine: Pending→Processing→Shipped→Delivered→Returned, writing to `inventory_transactions`). *(depends on Phase A order data)*
3. ✅ **DONE** — **User & staff administration** (per §6): `/admin/users` with list/search, edit, role management (self-lockout + last-admin guards), create/delete accounts via service-role, password reset. *(Audit log is the one nice-to-have not yet added.)*
4. **Account**: real loyalty tier from points; build (or hide) Settings.
5. ✅ **DONE (June 21)** — **PDP stock status** reflects `isOutOfStock`; out-of-stock add-to-cart is blocked on the PDP, the product card, and in `CartContext` (defense in depth). Verified on a real OOS product.
6. ✅ **DONE (June 21)** — **admin Customers** wired to real `profiles` + order aggregates (count + lifetime spend + tier). Verified.

### Phase C — Admin product CRUD (per §4) — partially unlocked
Add/delete/edit-all-fields, quantity, **image upload**, optimistic toggles, server-side paginated/searchable table — for the *main/sealed* inventory. The singles flow already does all of this; reuse `<PhotoUploader>`, `createSingle`/`deleteSingle` patterns, and the `product-images` bucket to extend it to sealed products.

### Phase D — Singles inventory + photo capture (per §5) — ✅ DONE (June 21)
Migration `0002` (single_details, product_images, Storage bucket + RLS) applied; `<PhotoUploader>` with mobile rear-camera capture; `createSingle`/`updateSingle`/`deleteSingle`; `/admin/singles` category-grouped CRUD. Live-verified (create, photo round-trip, delete). **Remaining follow-up:** surface the extra fields (grade/condition/cert) and the multi-photo gallery on the *storefront* single PDP.

### Phase E — Hardening & polish
- Cart/want-list persistence; `/shop` pagination; debounced search.
- Content pages (Privacy/ToS/Returns/Shipping/FAQ/Contact); real footer links.
- Real store address + Google Maps embed + hours; events moved to data (or clearly labeled).
- SEO: per-PDP `generateMetadata`, JSON-LD, `sitemap.ts`, `robots.ts`.
- Real product photography to replace `loremflickr`.
- a11y pass (dialog semantics, labels, contrast); loading/error routes.
- Error tracking (Sentry) + analytics + uptime monitor.
- Minor: drop `unoptimized` on the admin singles/PhotoUploader thumbnails now that `*.supabase.co` is allowlisted (storefront single photos already optimize); add the audit-log for admin user actions (§6); surface singles' grade/condition/gallery on the public PDP (§5 follow-up).

---

## 8. Testing & QA strategy

- **Unit** (Vitest): `lib/` data layer, `contexts/` (cart math, limits), tax calc, server actions' auth gating.
- **Integration**: order-creation pipeline (payment success → order rows → stock decrement → email) against a Supabase test project; image upload → Storage → `product_images`.
- **E2E** (Playwright — matches the Next 16 `@next/playwright` reference): homepage load, search, add-to-cart (incl. 3-limit and OOS guard), full checkout to confirmation, admin login → add product → upload photo → appears on storefront, **mobile** singles capture flow (emulated camera input).
- **Manual device matrix**: real iOS + Android for the camera-capture path (the one thing emulators don't fully prove).
- **CI** (GitHub Actions): `eslint` + `tsc --noEmit` + `vitest` + `playwright` on every PR; Netlify deploy previews; required checks before merge to `main`.
- **Security**: every server action validates input (zod) and calls `assertAdmin` where needed; RLS verified per-table; CSP + security headers.

## 9. Definition of "truly done"

The site is complete when:
1. A customer can browse (paginated), add to a cart that survives refresh, check out, **pay**, and receive an emailed confirmation — and the order appears in their account and the admin.
2. Stock is real: OOS items can't be bought; selling decrements quantity.
3. An admin can add, edit (every field), photograph, and delete products from a phone, including a dedicated singles flow with rear-camera capture.
4. An admin can manage users and staff — search, edit, change roles (safely), create staff, and deactivate accounts — and **no user can escalate their own privileges** (Phase 0 fix verified).
5. No hardcoded/filler data remains in any customer- or admin-facing surface (§1 fully cleared).
6. Legal/content pages exist; SEO basics present; a11y passes; errors are tracked.
7. Tests cover the critical paths and run in CI.

---

## Sources
- Code as of commit on `main`, June 20, 2026 (files cited inline).
- `AUDIT.md` (May 21) and `PRODUCTION_AUDIT.md` (May 25) for prior findings.
- `SUPABASE_SETUP.md` for the live backend wiring.
- `docs/SPECIFICATION.md` for intended business logic.
