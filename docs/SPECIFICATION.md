# Top Rated Cards & Collectibles - Project Specification

## 1. Project Overview & Vibe
Top Rated Cards & Collectibles is a premium ecommerce storefront for a family-owned neighborhood card shop. It serves as a chill, trustworthy hub for collectors to buy, pre-order, and trade premium sealed products and rare singles.
**Core Values:** Honesty, Integrity, Customer Appreciation.

## 2. Technology Stack
- **Frontend Framework:** Next.js 14+ (App Router), React
- **Styling:** Vanilla CSS Modules (`.module.css`) with a dark-theme, red-accented, glassmorphism aesthetic (Shopify-tier UX).
- **Backend/Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Payment & Point-of-Sale Sync:** Clover Commerce API

## 3. Core Features & Business Logic

### A. Storefront UI/UX
- **Animations:** Shopify-like IntersectionObserver scroll-reveals and Mega Menu navigation.
- **Home Page:** Dynamically displays "Featured", "New Releases", and "Pre-Orders" based on database flags.
- **Shop Page:** Advanced sidebar filtering parsing multi-level taxonomy (Category -> Subcategory).

### B. Cart & Checkout Rules
- **Quantity Limits:** Strict constraint ensuring a maximum of 3 identical items per customer per order to prevent hoarding.
- **Shipping Incentive:** Automated "Free Shipping" applied to orders totaling over $300.
- **Secure Vaulting:** Credit cards are tokenized via Clover's secure iframe, vaulted in Clover, and linked via `clover_customer_id` (Zero PCI compliance burden).

### C. Rewards & Loyalty Program
- **Earning:** Authenticated customers accumulate points based on purchase totals.
- **Loyalty Store:** A restricted, exclusive section of the site where items can only be purchased by redeeming accumulated Loyalty Points.

### D. Admin Portal
- A private route (`/admin`) for shop owners to seamlessly manage inventory.
- Features real-time toggle switches for Boolean business flags: `isSale`, `isFeatured`, `isNewRelease`, `isOutOfStock`, `isLimited`, `isPreOrder`.

## 4. Database Schema Structure
*Note: Currently mocked via local file, architected for 1:1 Supabase migration.*

1. **`INVENTORY`**: Flat table storing all product taxonomy, pricing, images, and boolean business logic flags.
2. **`CUSTOMERS`**: Stores non-Clover user data including `role` (user/admin), `loyalty_points`, and the `clover_customer_id` token.
3. **`ORDERS`**: Bridge table tracking purchase history and linking to the official external `clover_order_id`.
