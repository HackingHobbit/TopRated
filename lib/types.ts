// Shared types that both Server Components and Client Components can import.
// Keep this file free of runtime code so it can be pulled into client bundles
// without dragging server-only modules along with it.

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  subCategory: string;
  isSealed: boolean;
  isSale: boolean;
  isFeatured: boolean;
  isNewRelease: boolean;
  isOutOfStock: boolean;
  isLimited: boolean;
  isPreOrder: boolean;
  /** true = the stored image is a representative stand-in, not guaranteed to
   *  match the exact item shipped. Storefront surfaces a note when true. */
  imageRepresentative: boolean;
}

// One uploaded photo associated with a product (front/back/angles). The
// product's `image` field mirrors the primary one for list/grid thumbnails.
export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  position: number;
  isPrimary: boolean;
}

// Per-card attributes for an individual ("single") card. Sealed products
// have no SingleDetail. Mirrors public.single_details.
export interface SingleDetail {
  productId: string;
  subject: string;
  cardSet: string;
  year: number | null;
  cardNumber: string;
  condition: string;
  isGraded: boolean;
  grader: string;
  grade: string;
  certNumber: string;
}

// A single uploaded image as tracked client-side during the add/edit flow,
// before it's persisted into product_images. `path` is the Storage object
// path (used for removal); `url` is the public URL.
export interface UploadedImage {
  url: string;
  path: string;
}

// One ranked image-search candidate returned by the admin "Search for Image"
// tool (SearXNG-backed). Kept here (not in the 'use server' actions file, which
// may only export functions) so both client and server can share the shape.
export interface ImageCandidate {
  url: string;
  thumb: string;
  page: string;
  host: string;
  resolution: string;
  w: number;
  h: number;
  score: number;
  engine: string;
}

// A user row for the admin user-management table (profiles + auth metadata).
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  loyaltyPoints: number;
  createdAt: string;
}
