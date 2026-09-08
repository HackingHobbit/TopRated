import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow cross-origin requests for dev resources so CSS/JS loads via proxy.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '::1'],

  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''} https://checkout.clover.com https://checkout.sandbox.dev.clover.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.clover.com https://apisandbox.dev.clover.com https://scl.clover.com https://scl-sandbox.dev.clover.com https://checkout.clover.com https://checkout.sandbox.dev.clover.com",
      "frame-src 'self' https://www.google.com https://checkout.clover.com https://checkout.sandbox.dev.clover.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

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
