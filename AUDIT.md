# Top Rated — Website Audit

**Reviewer:** Claude · **Date:** May 21, 2026 · **Scope:** thorough audit, no code changes
**Stack reviewed:** Next.js 16.2.6 (App Router, Turbopack default), React 19.2, TypeScript, CSS Modules
**Live site:** https://topratedcc.netlify.app/ · **Repo:** https://github.com/HackingHobbit/TopRated

The good news: the app **compiles and builds successfully** (all 13 static pages generate; the only build failure was a sandbox `EPERM` on cleanup, not a code error), and v16's hardest breaking change — async `params`/`searchParams` — is already handled correctly in the one dynamic route that uses it (`app/shop/[id]/page.tsx:11`). Most issues below are bugs in app logic, missed Next.js conventions, performance opportunities, and security/data‑layer architecture choices that will bite during the Supabase migration in Phase 4.

Issues are ranked roughly by severity within each category. Every claim cites the file and line it came from.

---

## 1. Bugs that will misbehave in production

### 1.1 `lib/db.ts` is marked `"use server"` but exports an interface (`lib/db.ts:1,6`)
The file declares `"use server"` at the top, then exports the `Product` TypeScript interface. Types are erased at compile time so this builds, but it makes the file's intent ambiguous and means every client component that does `import { Product } from '@/lib/db'` (ProductCard, ProductEditModal, both contexts, ShopClient, the PDP) is reaching into a Server‑Actions module. More importantly, **`getProducts()`, `updateProduct()`, and `deleteProduct()` are now Server Actions callable by any unauthenticated client** — there is no admin check anywhere. Anyone who finds the action's RPC endpoint can mutate inventory and prices.
**Fix direction:** split shared types into `lib/types.ts`; keep mutations in a `"use server"` action file gated behind an auth check; read products from a Server Component data‑access layer rather than from Server Actions.

### 1.2 PDP redirects to a non‑existent route on missing product (`app/shop/[id]/page.tsx:32`)
```ts
router.push('/404');
```
There is no `/404` route in App Router. The Not Found UI lives at `app/not-found.tsx` and is triggered by the `notFound()` helper from `next/navigation`. Right now a bad product id silently navigates to a page that itself 404s, with a confused URL in the address bar.
**Fix direction:** make the PDP a Server Component, call `notFound()` when the product isn't found; the existing `app/not-found.tsx` will render.

### 1.3 PDP "Add to Cart" silently ignores quantity (`app/shop/[id]/page.tsx:17,57-70`)
There's a `selectedQuantity` state, but no UI exposes it, and `handleAddToCart` only calls `addToCart(product)` once. The inline comment admits this is broken. The button looks functional but quantity selection is dead code. ESLint flags `setSelectedQuantity` as unused.
**Fix direction:** either remove the unused state or extend `CartContext.addToCart` to accept a quantity and wire up a real quantity input on the PDP.

### 1.4 Navbar's "close on route change" effect never fires (`components/Navbar.tsx:20-22`)
```ts
useEffect(() => { setIsMobileMenuOpen(false); }, [router]);
```
`useRouter()` returns a stable object, so this effect runs once on mount and never on route change. The mobile menu does not close when the user taps a link — it only closes via the explicit `onClick={() => setIsMobileMenuOpen(false)}` handlers, which means it stays open if the user clicks the search submit or anything missing that handler. ESLint also flags this as a v19 anti‑pattern: "Calling setState synchronously within an effect can trigger cascading renders."
**Fix direction:** depend on `usePathname()` (or `usePathname()` + `useSearchParams()` together) instead of `router`, or close the menu inside link click handlers consistently.

### 1.5 Order number reshuffles on every render (`app/checkout/page.tsx:47`)
```tsx
<p>Order #TR-{Math.floor(Math.random() * 100000)}</p>
```
`Math.random()` runs every render — if the success screen re‑renders for any reason, the order ID changes in front of the user. React's purity lint already errors on this. Right now the success screen happens to be a leaf with no other state, so it survives, but it's a latent bug.
**Fix direction:** generate the ID once in `handlePlaceOrder` and store it in state alongside `step`.

### 1.6 Checkout form collects almost no data (`app/checkout/page.tsx:57-103`)
Only "Full Name" has a `defaultValue` from `user`. The other eight inputs (address, city, state, zip, card number, expiry, CVC) have no `name`, no controlled state, and no `FormData` extraction in `handlePlaceOrder` (lines 29-39). The user fills them in, the form submits, and the values are thrown away. The submit handler just runs `setTimeout` → `clearCart()` → step 3.
**Fix direction:** even for a mock, give inputs `name` attributes and read `new FormData(e.currentTarget)` in the handler so the data exists to forward to Supabase/Clover in Phase 4.

### 1.7 "Sign up" link points back to login (`app/login/page.tsx:59`)
```tsx
<p>Don&apos;t have an account? <Link href="/login" ...>Sign up</Link></p>
```
There is no `app/signup` route. Either build one or drop the link.

### 1.8 `ToastContext.removeToast` is used before it's declared (`contexts/ToastContext.tsx:29,33`)
`addToast` references `removeToast` inside its `setTimeout`, but `removeToast` is declared on a later line. Because of the closure timing it works at runtime, but ESLint flags it as an error and the React Compiler refuses to memoize the file. The `useCallback([])` for `addToast` also captures the very first `removeToast` reference, so the dependency array is wrong (missing `removeToast`).
**Fix direction:** swap the declaration order, add `removeToast` to the deps, or inline the filter inside the setTimeout: `setToasts(prev => prev.filter(t => t.id !== id))`.

### 1.9 `AuthContext` hydration mismatch risk (`contexts/AuthContext.tsx:26-37`)
Initial state is `isAuthenticated: false`, then `useEffect` reads `localStorage.mockAuth` and synchronously sets state to `true`. On a hard reload, the server (and the first paint) renders as logged‑out, then flips to logged‑in immediately after hydration — visible UI flash, and any code that conditionally renders auth‑gated routes will redirect to `/login` for one tick. The lint rule flags exactly this as "Calling setState synchronously within an effect can trigger cascading renders."
**Fix direction:** keep server rendering as anonymous, but render a stable shell (skeleton/spinner) until hydration finishes, or move auth into an HttpOnly cookie that the server can read via async `cookies()`.

### 1.10 React unescaped apostrophe (`app/account/page.tsx:113`)
```tsx
<p>You haven't saved any items yet.</p>
```
ESLint errors on the raw `'`. Escape as `&apos;` (the rest of the codebase already uses that convention).

### 1.11 `generate_seed.js` uses CommonJS in an ES module project (`generate_seed.js:1-2`)
Two `require()` calls error under the project's ESLint config. Not a runtime issue if you never invoke the script, but worth fixing.

---

## 2. Next.js 16 fit and deprecations

The codebase mostly conforms to v16 (async params is handled, `next.config.ts` uses the typed `NextConfig`, the package.json scripts already drop the `--turbopack` flag). Things to address:

### 2.1 No image optimization — `next/image` is used in zero files
Every product image, the logo, and the map are raw `<img>` tags (ESLint warns nine times, in `app/page.tsx:19,131`, `app/about/page.tsx:43`, `app/shop/[id]/page.tsx:82`, `components/CartDrawer.tsx:67`, `components/Footer.tsx:12`, `components/Navbar.tsx:46,119`, `components/ProductCard.tsx:39`). Product images come from `loremflickr.com` (`data/db.json`), which is a remote host — using `next/image` will require adding it to `images.remotePatterns` in `next.config.ts`. v16 deprecates `images.domains` in favor of `remotePatterns`, so do it the new way the first time. v16 also tightened defaults (`qualities: [75]`, `minimumCacheTTL: 4h`, 16px removed from `imageSizes`) — see `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:670-840`.

### 2.2 Fonts loaded via CSS `@import`, not `next/font` (`app/globals.css:1`)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter...');
```
This is a render‑blocking request to Google's CDN on every page. Next's `next/font/google` self‑hosts the font file with `font-display: swap` and eliminates layout shift. The README even says the project was scaffolded to use `next/font`, but the code doesn't.
**Fix direction:** load Inter and Outfit via `next/font/google` in `app/layout.tsx`, drop the `@import`, and reference the CSS variable from `globals.css`.

### 2.3 Whole homepage is wrapped in Client Components for animation (`app/page.tsx:16-135`, `components/ScrollReveal.tsx`)
Every section of the home page is wrapped in `<ScrollReveal>`, which is `"use client"`. Children of a Client Component are *not* automatically Client Components — they're passed through as a React node — but `ScrollReveal` itself is a `motion.div`, which means every section ships its slice of framer‑motion to the browser. The animation config (`viewport: { once: false }`, `initial: { opacity: 0.2, scale: 0.95 }`) replays on every scroll into view; combined with `backdrop-filter: blur(12px)` on glass panels, this gets choppy on lower‑end devices.
**Fix direction:** set `once: true` so the reveal runs once per page; consider CSS `@view-transition` (now a stable React feature in v19.2, see `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`) for a much cheaper animation primitive.

### 2.4 Dynamic PDP doesn't take advantage of instant navigation (`app/shop/[id]/page.tsx`)
The v16 docs explicitly call out `/shop/[slug]` as the canonical example of a route that *feels* unresponsive on client navigation between siblings (see `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md:136-200`). This app's PDP is even worse than the doc's bad example because it's a Client Component that re‑fetches the entire product list via a Server Action in a `useEffect`. There's no Suspense boundary; the page just shows "Loading…" via internal state.
**Fix direction:** rewrite the PDP as the docs recommend — a Server Component PDP that splits cached product info (`'use cache'`) from any uncached data behind a `<Suspense>` fallback, with `export const unstable_instant = { prefetch: 'static' }` to surface regressions at build time. The lib hint in `node_modules/next/dist/docs/index.md:11` is exactly this.

### 2.5 No `loading.tsx` or `error.tsx` anywhere
`/shop` wraps `ShopClient` in `<Suspense>` (`app/shop/page.tsx:16`), but otherwise the app has no route‑level loading states or error boundaries. Any thrown error in a route segment falls all the way to the framework default. The dev experience is fine; production users get a generic error page.
**Fix direction:** add `app/loading.tsx`, `app/error.tsx`, and at minimum `app/global-error.tsx` so render errors don't crash the whole layout tree.

### 2.6 No `<meta name="viewport">` or `viewport` export (`app/layout.tsx:12-15`)
`layout.tsx` exports a `metadata` object but no `viewport`. v15+ separates `viewport` from `metadata` — without it, mobile responsiveness depends on browser defaults. Add:
```ts
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
```

### 2.7 No `app/admin/layout.tsx` — sidebar is duplicated and inconsistent
`/admin` (`app/admin/page.tsx:8-18`) and `/admin/orders` (`app/admin/orders/page.tsx:8-18`) inline the same sidebar markup. `/admin/inventory` and `/admin/customers` don't have a sidebar at all — `customers/page.tsx:13` even uses class names (`adminPage`, `title`, `dashboardCard`, `tableResponsive`) that don't appear in `app/admin/page.module.css`, so it likely renders unstyled. This is exactly what `layout.tsx` is for.
**Fix direction:** move the sidebar into `app/admin/layout.tsx`; delete the inline copies; have all four pages share a single `page.module.css` for admin chrome.

### 2.8 No admin auth gate (`app/admin/**`)
Anyone can navigate to `/admin` or POST to the `updateProduct` Server Action. The roadmap (`docs/FRONTEND_BACKEND_TODO.md`) doesn't mention this. Even before Supabase Auth lands, you can gate the route with a server check (read a cookie, redirect to `/login` if no admin role).

### 2.9 Static admin/checkout data hardcoded as if mocked
`app/admin/page.tsx:32,41,50,59` (sales/orders/stock/customers metrics), `app/admin/page.tsx:78-95` (recent‑orders table), `app/admin/orders/page.tsx:56-86`, `app/admin/customers/page.tsx:5-10`, and `app/account/page.tsx:81-104` (order history) are all hardcoded literals. The dashboard date is also hardcoded (`May 21, 2026`, `app/admin/page.tsx:23`) — it'll be stuck on that date forever. Fine as placeholders; flag them so the Phase 4 migration knows what to replace.

### 2.10 `next.config.ts` is essentially empty
You'll want, at minimum: `images.remotePatterns` for `loremflickr.com` (and Supabase storage later), a `Content-Security-Policy` header (see `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`), and likely `experimental.reactCompiler: true` once you've cleaned up the manual memoization issues in §3.4.

---

## 3. Performance and architecture

### 3.1 Every page reads the entire JSON DB on every request (`lib/db.ts:25-28`, `app/page.tsx:9`, `app/shop/page.tsx:7`, `app/admin/inventory/page.tsx:6`)
`getProducts()` does `fs.readFile(...)` synchronously on each call with no caching. Each page render — `/`, `/shop`, `/admin/inventory`, and the PDP — re‑parses the entire 2,500‑line JSON. Once you're on Supabase this matters less, but right now even local dev navigation is reading the file twice on every hop because the PDP calls it again via a useEffect Server Action.
**Fix direction:** wrap the read in `cache()` from React (or `'use cache'` with a `cacheTag('products')` per v16's stabilized cache API — see version-16.md:454-580). When you migrate to Supabase, use `cacheTag('products')` and call `revalidateTag('products', 'max')` from the admin mutation actions.

### 3.2 PDP fetches the *whole* list to find one item (`app/shop/[id]/page.tsx:25-26`)
```ts
const allProducts = await getProducts();
const found = allProducts.find(p => p.id === id);
```
Even in Supabase form this is fine for 160 rows, but is exactly the wrong pattern to ship to production. A `getProductById(id)` (with `'use cache'` keyed by id) is the right shape.

### 3.3 `app/admin/inventory` ships the entire product list to the client (`app/admin/inventory/page.tsx:23`, `components/InventoryTable.tsx`)
The whole inventory is serialized into the client component as `initialProducts`. For 160 rows this is OK; once there are 10k+ products this becomes prohibitive. Plan for server‑side pagination/search before migration.

### 3.4 Server Actions misused for reads (`app/shop/[id]/page.tsx:25`, also implicit on every PDP render)
Server Actions are designed for mutations — they're POST‑only, can't be prefetched, and aren't cached. Using them as a generic RPC for reads costs you SSR, streaming, and the v16 instant‑navigation benefits.
**Fix direction:** reads go in Server Components (or `cache()`‑wrapped helpers called from Server Components); Server Actions stay reserved for `updateProduct` / `deleteProduct` etc.

### 3.5 React Compiler skipped due to manual memoization issues (`contexts/ToastContext.tsx:33`)
ESLint reports "Compilation Skipped: Existing memoization could not be preserved" on `ToastContext`. v16 stabilized the React Compiler; you're leaking that win.
**Fix direction:** fix the issue from §1.8, then opt in via `reactCompiler: true` in `next.config.ts` (version-16.md:408-451).

### 3.6 Cart and want‑list are not persisted across reloads (`contexts/CartContext.tsx:27`, `contexts/WantListContext.tsx:17`)
Both reset on every refresh. For a card‑shop storefront this is unusual — most stores persist the cart for at least the session. The auth context already uses localStorage; the cart and want‑list should too (or move to an HttpOnly cookie / Supabase server‑side cart).

### 3.7 `ProductEditModal` is missing `"use client"` (`components/ProductEditModal.tsx:1`)
It uses `useState` directly. It compiles only because the importing parent (`InventoryTable`) is already a Client Component, which puts the file in the client bundle by transitive inclusion. This is fragile — if the modal were ever imported from a Server Component it would fail to build with a non‑obvious error. Add `"use client"` to the top.

### 3.8 Provider stack ordering (`app/layout.tsx:25-37`)
The current order is `AuthProvider > ToastProvider > WantListProvider > CartProvider`. `CartProvider` and `WantListProvider` both call `useToast()`, so `ToastProvider` is above them — correct. But `AuthProvider` is at the top and doesn't depend on Toast/Cart/WantList, so consider moving `ToastProvider` to the outermost position; that way you can dispatch toasts from anywhere including auth flows, and you avoid future ordering bugs as providers gain interdependencies.

---

## 4. UX and accessibility

### 4.1 Header iconography is unlabeled (`components/Navbar.tsx:100-112`)
The user/cart/menu icon buttons have no `aria-label`. The favorite button on the product card and PDP both have labels (`components/ProductCard.tsx:48`, `app/shop/[id]/page.tsx:129`), but `components/CartDrawer.tsx:37,80,86,95` close/quantity/remove buttons don't.

### 4.2 Cart `<dialog>` semantics missing (`components/CartDrawer.tsx:30-122`)
The drawer is a `div` with an overlay div. It should be a `<dialog>` (or have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`), and focus should trap inside it while open. Right now keyboard users tab past it; `Escape` doesn't close it.

### 4.3 Glass‑panel contrast (`app/globals.css:79-85`)
`backdrop-filter: blur(12px)` on `rgba(18, 20, 29, 0.7)` over varied backgrounds can drop the text contrast under WCAG AA thresholds, depending on what's behind. Worth a Lighthouse contrast pass.

### 4.4 `loremflickr.com` images are slow and inconsistent
The seeded image URLs (`data/db.json`) all point to `loremflickr.com`, which is slow and occasionally returns a different image for the same `?lock=N` between requests. Combined with no image optimization (§2.1), product cards visibly flicker on first paint.

### 4.5 Card click target overlaps the favorite button (`components/ProductCard.tsx:37,45-51`)
The `<Link>` uses `style={{ display: 'contents' }}` to wrap the image area, and the favorite button calls `e.preventDefault()` to stop the link navigation. This works in modern browsers but `display: contents` has known accessibility issues (in some browsers the link is removed from the accessibility tree). Safer: keep the link as a normal block and absolutely‑position the favorite button outside the link, or use a button‑in‑link pattern with `event.stopPropagation()` instead of `display: contents`.

### 4.6 "Shop Sealed" / "Browse Singles" links don't map to filters (`app/page.tsx:33,36`)
The hero links push `?category=sealed` and `?category=singles`, but the seeded data uses `category` values like `sports`, `tcg`, etc. (`db.json`). The filters silently match nothing and show "No products found for these filters." Either rename the data's category field to include `sealed`/`singles` (probably an `isSealed` cross‑cut), or change the link targets to `?subCategory=...` that actually exists.

### 4.7 Section headers render even when their grid is empty (`app/page.tsx:44-87`)
The featured/new‑releases/pre‑orders sections always render their `<h2>` and "View All" link, even if the grid is empty. The seeded db has 12 pre‑orders so that section is fine today, but a future inventory state where none of the three flags has matches will show three section headers with empty grids beneath them. Conditionally render each `<section>` only when `topFeatured.length > 0` (etc.), or show a small empty‑state in the grid.

### 4.8 Footer social and policy links are dead (`components/Footer.tsx:22-24, 43-46`)
All `href="#"` — fine for a prototype, easy to forget at launch.

### 4.9 Mobile dropdown menu replays animation forever (`components/ScrollReveal.tsx:10`)
`viewport: { once: false }` triggers every time the section enters the viewport, which on mobile means every scroll up and down replays the fade+scale. Disable repeat or set `once: true`.

---

## 5. Quick wins (do these first)

These are 5–30 minute changes with outsized value:

1. **Fix the Navbar menu effect** (`Navbar.tsx:20`) — switch to `usePathname()`. Single‑line change, eliminates a real bug.
2. **Fix the `/404` push in the PDP** (`shop/[id]/page.tsx:32`) — call `notFound()`. The plumbing already exists.
3. **Fix the `Math.random()` order id** (`checkout/page.tsx:47`) — generate once in the handler.
4. **Drop the unused `Search` import** (`shop/ShopClient.tsx:8`) and the `let → const` (`ShopClient.tsx:35`).
5. **Escape the apostrophe** (`account/page.tsx:113`).
6. **Sign‑up link** (`login/page.tsx:59`) — drop it or build the route.
7. **Add `viewport` export** to `app/layout.tsx`.
8. **Add `app/admin/layout.tsx`** with the shared sidebar; delete the inline copies in `page.tsx` and `orders/page.tsx`.
9. **Self‑host fonts via `next/font/google`** in `layout.tsx`; remove the `@import` in `globals.css`.

---

## 6. Phase‑4 readiness checklist (Supabase migration)

When you wire up Supabase, the current architecture forces you to also do the following — flagging it now so it isn't a surprise:

1. Move `Product` and other types out of the `"use server"` file (§1.1) so client components can import types without pulling in server-action boilerplate.
2. Replace `getProducts()` reads called from Server Components with a `cache()`‑wrapped `lib/products.ts` data‑access layer. Reserve `"use server"` for mutations only, and gate them behind an auth check (Supabase row‑level security on the client + a server check on the action).
3. Use `cacheTag('products')` + `revalidateTag('products', 'max')` (v16 syntax: `revalidateTag` now requires a second cacheLife argument — see version-16.md:457) when mutating inventory in the admin.
4. Decide on cart persistence (§3.6) before you start. Either keep a client cart in localStorage + sync to Supabase on auth, or go straight to a server cart from day one.
5. Configure `images.remotePatterns` for both the placeholder host *and* the Supabase storage bucket once you've adopted `next/image`.

---

## Sources

- Lint: `npx eslint .` (22 problems, 9 errors, 13 warnings) ran against the repo.
- Build: `npx next build` — compiled successfully, generated all 13 static pages. The `EPERM` failure at the cleanup step is a sandbox filesystem quirk, not a code issue.
- Next.js 16 reference: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` (read in full) and `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.
