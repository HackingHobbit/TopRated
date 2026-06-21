import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow cross-origin requests for dev resources so CSS/JS loads via proxy.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '::1'],

  // v16 deprecates images.domains in favor of remotePatterns.
  images: {
    remotePatterns: [
      // Generic keyword placeholder used by the ingestion script's fallback
      // (scripts/ingest_inventory.py). When a product has no entry in
      // scripts/image_map.json, the ingestion picks a category-tuned
      // loremflickr URL.
      { protocol: 'https', hostname: 'loremflickr.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      // Real Pokemon TCG product images sourced from the public
      // 1niceroli/ptcg-assets repo (see scripts/map_pokemon_images.py).
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      // Supabase Storage — product/singles photos uploaded via <PhotoUploader>
      // (bucket: product-images). Required for next/image to render them on
      // the storefront; without it any photographed single throws.
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
