# Frontend & Backend Roadmap / TODO

This document serves as the master checklist and source of truth for the project's development state.

## Phase 1: Infrastructure & Mocking (✅ Completed)
- [x] Initial Next.js App Router setup & cleanup.
- [x] Design System established (Vanilla CSS, Glassmorphism, Dark Mode).
- [x] Mock Database generation script built (160 dynamic items).
- [x] Admin Portal CRUD UI structured for owner management.

## Phase 2: UI Polish & UX Improvements (✅ Completed)
- [x] Shopify-tier Mega Menu built into Navbar.
- [x] Scroll-driven IntersectionObserver animations built (`ScrollReveal`).
- [x] Home Page dynamic sections added (Featured, Pre-Orders, New Releases).
- [x] Shop Page Advanced Sidebar Filtering complete.

## Phase 3: Global State & Shopping Cart (🏗️ Next up)
**Frontend Tasks:**
- [ ] Implement React Context / Zustand for Global Cart State across the app.
- [ ] Build Slide-out Cart Drawer UI.
- [ ] Implement cart constraints: Force Maximum 3 quantity limit per item.
- [ ] Implement Free Shipping progress bar (Calculate cart total -> unlock at $300).

## Phase 4: Supabase Integration & Auth (⏳ Pending)
**Backend Tasks:**
- [ ] Provision real Supabase project & execute SQL schema setup.
- [ ] Migrate `data/db.json` into Supabase `INVENTORY` table.
- [ ] Replace `lib/db.ts` mock functions with `@supabase/supabase-js` calls.
- [ ] Set up Supabase Authentication (Email/Password).

**Frontend Tasks:**
- [ ] Build Login/Register UI flows.
- [ ] Build User Profile page showing accumulated `loyalty_points`.
- [ ] Build exclusive "Loyalty Store" that is conditionally locked to authenticated users.

## Phase 5: Clover Integration (⏳ Pending)
**Backend Tasks:**
- [ ] Build Next.js internal API routes to mock Clover Orders & Payments (Pre-API keys).
- [ ] Implement Clover iframe Tokenization logic for Vaulting user cards.
- [ ] Sync successful Clover transactions to our internal `ORDERS` table.
