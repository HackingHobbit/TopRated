# Top Rated — Live Site Test & Audit

**Date:** July 11, 2026 · **Target:** https://topratedcc.netlify.app (live)
**Method:** authenticated real-browser walkthrough (Chrome) of the storefront **and the full admin portal**, plus source review. Signed in as the admin account to exercise every admin screen.

> **Update since the July 9 report:** the Supabase backend has been **restored** — the store is operational again. Products render, sign-in works, and the admin portal is reachable. The July 9 headline (backend NXDOMAIN outage) is resolved. **The underlying risk remains:** free-tier Supabase auto-pauses, so without a keep-alive this *will* recur — see Suggestions.

---

## Storefront — working (verified live)
- **Products render** on `/shop` (real Supabase data): e.g. Mosaic Blaster Box $60, Phoenix Blaster $35, Topps Chrome Hobby Box $440, with SEALED/NEW badges.
- **Out-of-stock is enforced live:** OOS items show the badge and a disabled "Out of Stock" button (can't be added).
- **Mobile shop** collapses filters behind a "Filters & Sort" toggle (products first).
- **Auth:** `/login` renders in real Supabase mode; sign-in succeeds; the admin gate redirects anonymous users and lets admins through.

---

## Admin Portal — functional audit (all six screens, live)

| Screen | State | Detail |
|---|---|---|
| **Dashboard** (`/admin`) | 🟡 Mock | Metrics are hardcoded literals ($4,295.50 sales, 24 orders, 12 low-stock, 1,204 customers); "Recent Activity" is fake (TR-10495 / Mike W. …). Only the date is dynamic. Decorative — not connected to real data. |
| **Inventory** (`/admin/inventory`) | 🟢 Real / partial | Real 433 products. Inline flag toggles (Sale/Featured/New/OOS) and per-row **Edit** (name/desc/price/image-URL) work. **Missing:** Add product, Delete, quantity/SKU, and **any in-table search or pagination** (all 433 rows render at once). |
| **Custom Inventory** (`/admin/singles`) | 🟢 Real / caveat | Full CRUD, category-grouped, with a **search box**, **Add Single**, and per-row edit/delete. The Add form is genuinely good UX (photo capture — "Add Photos" + "Take Photo" — front and center, mobile-first). **Caveat (confirmed live):** the list is populated by **accessories** (binders, sleeves, top loaders), not single cards — the "single = not sealed" definition is too broad. Row thumbnails are empty (imported items have no photo). |
| **Orders** (`/admin/orders`) | 🔴 Mock | Entirely hardcoded: 4 fake rows with May-2026 dates; **Search, Export CSV, Fulfill, and View are all dead**. A real order placed at checkout never appears here. Highest-impact admin gap. |
| **Customers** (`/admin/customers`) | 🟢 Real | Wired to real profiles + order aggregates (showed the admin account: Admin, 0 orders, $0.00, Bronze). "Manage Users" link. |
| **Users** (`/admin/users`) | 🟢 Real | Real user list with **Add User enabled** (service-role key is set on Netlify), an inline role dropdown (customer⇄admin), edit / password-reset / delete actions, and search. Self-delete is disabled. Role/last-admin guards exist in code. |

**Net:** the *foundation* screens (Inventory, Custom Inventory, Customers, Users) are real and functional; the *reporting* screens (Dashboard, Orders) are still mock, and Inventory lacks create/delete + search. Orders being fake is the biggest functional hole — it's the screen the shop owner would live in.

---

## Admin Portal — UX audit

**Strengths**
- Consistent, on-brand shell: persistent left sidebar, a red "ADMIN" pill in the top nav, clear section titles, cohesive dark theme.
- Efficient patterns where they exist: inline flag toggles on Inventory; role dropdown on Users; guarded destructive actions (self-delete disabled, delete confirmation); toast feedback on inventory/singles/user actions.
- Custom Inventory and Users each have a **search box + a primary action button** — the right pattern.
- The Add-a-Single flow is the strongest screen: photo-first, mobile-optimized, sensible field grouping (card details, condition/grading, flags).

**Gaps & inconsistencies**
- **Inconsistent list UX:** Custom Inventory has search; the main **Inventory (433 rows) has neither search nor pagination** — the screen a shop owner uses most is the hardest to navigate. It should get search, pagination, and Add/Delete to match.
- **Dead controls erode trust:** Orders' Search / Export CSV / Fulfill / View and the Dashboard metrics look real but do nothing. A non-functional control is worse than none — either wire them or hide them until wired.
- **Empty thumbnails** in Custom Inventory read as broken. Show a placeholder image / "No photo" chip for items without an image.
- **No breadcrumb / "back to list"** on the Add/Edit sub-pages (minor navigation friction).
- **Mobile admin:** the ≤768px stacking fix is confirmed in the live CSS and was verified locally; a live on-device re-check is still worth doing (the audit tool couldn't force a mobile viewport in the real browser).
- **Data honesty:** because Dashboard/Orders are mock, an admin can't trust any number on the landing screen — fixing these is as much a *trust* issue as a feature.

---

## Cross-cutting — still needed (unchanged by the restore)
- **Resilience (high):** `getProducts()` still returns `[]` on backend failure with no `db.json` fallback — which is *why* the July 9 pause blanked the whole store. Add graceful degradation.
- **Payments (high):** still mocked; **tax** still 0. The store cannot transact.
- **Real data for Dashboard + Orders + Account order history (high):** connect to Supabase; add order-status transitions.
- **SEO (high/med):** no per-product `generateMetadata`; `sitemap.xml` / `robots.txt` 404; no OG/Twitter/JSON-LD/canonicals.
- **Security headers (med):** add CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy (HSTS + nosniff present).
- **Content/legal pages (med):** Privacy, Terms, Returns, Shipping, FAQ, Contact; real footer links; real store address/map.
- **Two dead "Pokémon" links (bug):** hero (`app/page.tsx:74`) + footer (`components/Footer.tsx:38`) → fix to `?subCategory=TCG`.
- **Singles definition (decision):** stop listing accessories as "singles."
- **Ops (high):** keep Supabase awake (keep-alive/Pro) + uptime monitoring so the store doesn't silently go down again.

## Verified live vs. still manual
- **Verified live this pass:** storefront products + OOS enforcement, login, admin gate, and all six admin screens' real/mock state and controls.
- **Not exercised (to avoid mutating production):** creating/deleting a real product, user, or order; a real checkout. These were verified locally earlier against the same code + DB.

## Recommended next
1. **Keep it up:** add a Supabase keep-alive + uptime monitor so the outage doesn't recur; add the `getProducts()` fallback so a pause degrades gracefully.
2. **Make the admin honest:** wire Dashboard metrics, the Orders table (+ Fulfill status flow), and account order history to real data — the core data-integrity fix.
3. **Bring Inventory to parity:** add search, pagination, and Add/Delete (reuse the Custom Inventory patterns).
4. **Commerce:** Clover payments + real tax.
5. **SEO + security-headers batch** and fix the two Pokémon links.

## Sources
Authenticated browser walkthrough of the live site on July 11, 2026, plus source review. Prior: the July 9 outage findings (this file's earlier revision), `MASTER_PLAN.md`, `AUDIT.md`, `PRODUCTION_AUDIT.md`.
