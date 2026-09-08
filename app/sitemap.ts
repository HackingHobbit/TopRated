import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/db';
import { absoluteUrl } from '@/lib/site';

const publicRoutes = [
  { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
  { path: '/shop', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/about', changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.5 },
  { path: '/policies', changeFrequency: 'yearly' as const, priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();

  return [
    ...publicRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/shop/${encodeURIComponent(product.id)}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      images: product.image ? [product.image] : undefined,
    })),
  ];
}
