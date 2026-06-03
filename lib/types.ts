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
}
