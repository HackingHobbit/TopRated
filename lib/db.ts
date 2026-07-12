// Server-only data-access layer. Imported by Server Components (and by
// lib/actions.ts). Do NOT add 'use server' here — that would convert every
// exported function into a Server Action and expose it as an unauthenticated
// RPC endpoint to the browser.
//
// During the Supabase transition this module supports two backends:
//   - Supabase Postgres when NEXT_PUBLIC_SUPABASE_* env vars are set
//   - data/db.json fallback otherwise (keeps the demo working before setup)
//
// See SUPABASE_SETUP.md for switching backends.

import 'server-only';
import { cache } from 'react';
import fs from 'fs/promises';
import path from 'path';
import { getSupabaseServer } from './supabase/server';
import { supabaseConfigured } from './supabase/env';
import { isSingle } from './productFacets';
import type {
  Product,
  AdminUser,
  SingleDetail,
  ProductImage,
} from './types';

export type { Product };

export interface CategoryOption {
  id: string;
  name: string;
  topLevel: string;
}

export interface SingleWithDetails {
  product: Product;
  detail: SingleDetail | null;
  images: ProductImage[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface DBShape {
  products: Product[];
}

interface ProductRow {
  id: string;
  name: string;
  description: string;
  price: number | string;
  image: string;
  category_id: string | null;
  sku: string | null;
  is_sealed: boolean;
  is_sale: boolean;
  is_featured: boolean;
  is_new_release: boolean;
  is_out_of_stock: boolean;
  is_limited: boolean;
  is_pre_order: boolean;
  image_representative: boolean;
}

interface CategoryRow {
  id: string;
  top_level: string;
}

async function readJSON(): Promise<DBShape> {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data) as DBShape;
}

function rowToProduct(row: ProductRow, topByCategory: Map<string, string>): Product {
  const sub = row.category_id ?? 'Accessories';
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image: row.image,
    category: topByCategory.get(sub) ?? 'accessories',
    subCategory: sub,
    isSealed: row.is_sealed,
    isSale: row.is_sale,
    isFeatured: row.is_featured,
    isNewRelease: row.is_new_release,
    isOutOfStock: row.is_out_of_stock,
    isLimited: row.is_limited,
    isPreOrder: row.is_pre_order,
    imageRepresentative: row.image_representative ?? false,
  };
}

// React.cache() de-dupes within a single request. Once you migrate to
// Supabase + Cache Components, swap this for `'use cache'` keyed by
// the same arguments and tag the cache with cacheTag('products').
export const getProducts = cache(
  async (filters?: Partial<Product>): Promise<Product[]> => {
    if (supabaseConfigured()) {
      const products = await fetchProductsFromSupabase();
      return applyFilters(products, filters);
    }
    const db = await readJSON();
    return applyFilters(db.products, filters);
  }
);

export const getProductById = cache(
  async (id: string): Promise<Product | null> => {
    if (supabaseConfigured()) {
      const supabase = await getSupabaseServer();
      if (supabase) {
        const [{ data: product }, { data: cats }] = await Promise.all([
          supabase
            .from('products')
            .select(
              'id, name, description, price, image, category_id, sku, is_sealed, is_sale, is_featured, is_new_release, is_out_of_stock, is_limited, is_pre_order, image_representative'
            )
            .eq('id', id)
            .maybeSingle(),
          supabase.from('categories').select('id, top_level'),
        ]);
        if (!product) return null;
        const topByCategory = new Map(
          (cats ?? []).map((c: CategoryRow) => [c.id, c.top_level])
        );
        return rowToProduct(product as ProductRow, topByCategory);
      }
    }
    const db = await readJSON();
    return db.products.find((p) => p.id === id) ?? null;
  }
);

async function fetchProductsFromSupabase(): Promise<Product[]> {
  const supabase = await getSupabaseServer();
  if (!supabase) return [];

  // Pull products + the (small) category lookup in parallel so we can join
  // top_level into the Product shape that the UI already expects.
  const [{ data: products, error: pErr }, { data: cats, error: cErr }] =
    await Promise.all([
      supabase
        .from('products')
        .select(
          'id, name, description, price, image, category_id, sku, is_sealed, is_sale, is_featured, is_new_release, is_out_of_stock, is_limited, is_pre_order, image_representative'
        )
        .order('name', { ascending: true }),
      supabase.from('categories').select('id, top_level'),
    ]);

  if (pErr) {
    console.error('[lib/db] getProducts:', pErr.message);
    return [];
  }
  if (cErr) {
    console.error('[lib/db] categories:', cErr.message);
  }

  const topByCategory = new Map(
    (cats ?? []).map((c: CategoryRow) => [c.id, c.top_level])
  );
  return (products ?? []).map((row: ProductRow) =>
    rowToProduct(row, topByCategory)
  );
}

function applyFilters(
  products: Product[],
  filters: Partial<Product> | undefined
): Product[] {
  if (!filters) return products;
  return products.filter((p) => {
    for (const [key, value] of Object.entries(filters)) {
      if (p[key as keyof Product] !== value) return false;
    }
    return true;
  });
}

// ----------------------------------------------------------------------
// Admin reads (Supabase only; empty/null in JSON fallback mode)
// ----------------------------------------------------------------------

/** All user profiles, for the admin user-management table. Admin RLS lets a
 *  logged-in admin read every row. */
export const getAllUsers = cache(async (): Promise<AdminUser[]> => {
  if (!supabaseConfigured()) return [];
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, loyalty_points, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[lib/db] getAllUsers:', error.message);
    return [];
  }
  return (data ?? []).map((r: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    loyalty_points: number | null;
    created_at: string;
  }) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? '',
    role: r.role === 'admin' ? 'admin' : 'customer',
    loyaltyPoints: r.loyalty_points ?? 0,
    createdAt: r.created_at,
  }));
});

/** Category options (subcategory id + display + top level) for pickers. */
export const getCategories = cache(async (): Promise<CategoryOption[]> => {
  if (!supabaseConfigured()) return [];
  const supabase = await getSupabaseServer();
  if (!supabase) return [];
  const { data } = await supabase
    .from('categories')
    .select('id, name, top_level')
    .order('top_level', { ascending: true })
    .order('name', { ascending: true });
  return (data ?? []).map(
    (c: { id: string; name: string; top_level: string }) => ({
      id: c.id,
      name: c.name,
      topLevel: c.top_level,
    })
  );
});

/** All single cards for the admin list. A "single" is a non-sealed product in
 *  a card category (sports/tcg) — NOT a beverage/accessory/memorabilia item,
 *  which happen to also be non-sealed. See lib/productFacets.isSingle. */
export const getSingles = cache(async (): Promise<Product[]> => {
  const all = await getProducts();
  return all.filter(isSingle);
});

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  loyaltyPoints: number;
  orders: number;
  spent: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
}

function tierFor(points: number): CustomerRow['tier'] {
  if (points >= 5000) return 'Diamond';
  if (points >= 1000) return 'Gold';
  if (points >= 250) return 'Silver';
  return 'Bronze';
}

/** Customers for the admin Customers page: real profiles enriched with order
 *  count + lifetime spend aggregated from the orders table. */
export const getCustomers = cache(async (): Promise<CustomerRow[]> => {
  if (!supabaseConfigured()) return [];
  const supabase = await getSupabaseServer();
  if (!supabase) return [];

  const [{ data: profiles }, { data: orders }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, email, role, loyalty_points, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('orders').select('customer_id, total'),
  ]);

  const agg = new Map<string, { orders: number; spent: number }>();
  for (const o of (orders ?? []) as { customer_id: string | null; total: number | string }[]) {
    if (!o.customer_id) continue;
    const a = agg.get(o.customer_id) ?? { orders: 0, spent: 0 };
    a.orders += 1;
    a.spent += Number(o.total) || 0;
    agg.set(o.customer_id, a);
  }

  return ((profiles ?? []) as {
    id: string;
    name: string | null;
    email: string;
    role: string;
    loyalty_points: number | null;
    created_at: string;
  }[]).map((p) => {
    const a = agg.get(p.id) ?? { orders: 0, spent: 0 };
    const points = p.loyalty_points ?? 0;
    return {
      id: p.id,
      name: p.name ?? '',
      email: p.email,
      role: p.role === 'admin' ? 'admin' : 'customer',
      loyaltyPoints: points,
      orders: a.orders,
      spent: Math.round(a.spent * 100) / 100,
      tier: tierFor(points),
    };
  });
});

/** One single with its detail row and ordered images, for the edit screen. */
export const getSingleWithDetails = cache(
  async (id: string): Promise<SingleWithDetails | null> => {
    const product = await getProductById(id);
    if (!product) return null;
    if (!supabaseConfigured()) return { product, detail: null, images: [] };
    const supabase = await getSupabaseServer();
    if (!supabase) return { product, detail: null, images: [] };

    const [{ data: d }, { data: imgs }] = await Promise.all([
      supabase
        .from('single_details')
        .select(
          'subject, card_set, year, card_number, condition, is_graded, grader, grade, cert_number'
        )
        .eq('product_id', id)
        .maybeSingle(),
      supabase
        .from('product_images')
        .select('id, product_id, url, position, is_primary')
        .eq('product_id', id)
        .order('position', { ascending: true }),
    ]);

    const detail: SingleDetail | null = d
      ? {
          productId: id,
          subject: d.subject ?? '',
          cardSet: d.card_set ?? '',
          year: d.year ?? null,
          cardNumber: d.card_number ?? '',
          condition: d.condition ?? '',
          isGraded: d.is_graded ?? false,
          grader: d.grader ?? '',
          grade: d.grade ?? '',
          certNumber: d.cert_number ?? '',
        }
      : null;

    const images: ProductImage[] = (imgs ?? []).map((r: {
      id: string;
      product_id: string;
      url: string;
      position: number;
      is_primary: boolean;
    }) => ({
      id: r.id,
      productId: r.product_id,
      url: r.url,
      position: r.position,
      isPrimary: r.is_primary,
    }));

    return { product, detail, images };
  }
);
