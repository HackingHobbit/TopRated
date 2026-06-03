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
import type { Product } from './types';

export type { Product };

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
              'id, name, description, price, image, category_id, sku, is_sealed, is_sale, is_featured, is_new_release, is_out_of_stock, is_limited, is_pre_order'
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
          'id, name, description, price, image, category_id, sku, is_sealed, is_sale, is_featured, is_new_release, is_out_of_stock, is_limited, is_pre_order'
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
