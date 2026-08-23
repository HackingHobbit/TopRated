'use server';

// Server Actions for inventory mutations. Every function in this file is
// exposed to the browser as a POST RPC endpoint, so each one MUST verify
// the caller's permissions before touching data.
//
// During the Supabase transition this file supports two backends:
//   - Supabase when NEXT_PUBLIC_SUPABASE_* + admin-role profile are set up
//   - data/db.json fallback otherwise (admin gate is the assertAdmin stub)
//
// Once you've completed SUPABASE_SETUP.md, the JSON path becomes
// vestigial and can be deleted. Keeping it during the transition lets
// you exercise the admin UI without Supabase.

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from './supabase/server';
import { supabaseConfigured } from './supabase/env';
import { assertAdmin } from './auth-guard';
import type { Product } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface DBShape {
  products: Product[];
}

async function readJSON(): Promise<DBShape> {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data) as DBShape;
}

async function writeJSON(data: DBShape): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// ----------------------------------------------------------------------
// Server Actions
// ----------------------------------------------------------------------

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product> {
  await assertAdmin();

  if (supabaseConfigured()) {
    const supabase = await getSupabaseServer();
    if (!supabase) throw new Error('Supabase client unavailable.');

    // The DB column names don't match the camelCase TS types — map them.
    const dbUpdates: Record<string, unknown> = {};
    const map: Record<keyof Product, string> = {
      id: 'id',
      name: 'name',
      description: 'description',
      price: 'price',
      image: 'image',
      category: 'category', // ignored: derived from category_id
      subCategory: 'category_id',
      isSealed: 'is_sealed',
      isSale: 'is_sale',
      isFeatured: 'is_featured',
      isNewRelease: 'is_new_release',
      isOutOfStock: 'is_out_of_stock',
      isLimited: 'is_limited',
      isPreOrder: 'is_pre_order',
      imageRepresentative: 'image_representative',
    };
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'category') continue; // top-level is read-only here
      const dbKey = map[k as keyof Product];
      if (dbKey) dbUpdates[dbKey] = v;
    }

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select(
        'id, name, description, price, image, category_id, sku, is_sealed, is_sale, is_featured, is_new_release, is_out_of_stock, is_limited, is_pre_order, image_representative'
      )
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Product not found.');

    revalidatePath('/admin/inventory');
    revalidatePath('/shop');
    revalidatePath(`/shop/${id}`);

    // Top-level category is derived from category_id — same categories
    // table + Map lookup as rowToProduct() in lib/db.ts.
    const { data: cats } = await supabase
      .from('categories')
      .select('id, top_level');
    const topByCategory = new Map(
      (cats ?? []).map((c: { id: string; top_level: string }) => [c.id, c.top_level])
    );
    const subCategory = data.category_id ?? 'Accessories';

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      image: data.image,
      category: topByCategory.get(subCategory) ?? 'accessories',
      subCategory,
      isSealed: data.is_sealed,
      isSale: data.is_sale,
      isFeatured: data.is_featured,
      isNewRelease: data.is_new_release,
      isOutOfStock: data.is_out_of_stock,
      isLimited: data.is_limited,
      isPreOrder: data.is_pre_order,
      imageRepresentative: data.image_representative ?? false,
    };
  }

  // ---- fallback: JSON file ----
  const db = await readJSON();
  const index = db.products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');

  db.products[index] = { ...db.products[index], ...updates };
  await writeJSON(db);
  return db.products[index];
}

export async function deleteProduct(id: string): Promise<void> {
  await assertAdmin();

  if (supabaseConfigured()) {
    const supabase = await getSupabaseServer();
    if (!supabase) throw new Error('Supabase client unavailable.');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/inventory');
    revalidatePath('/shop');
    return;
  }

  const db = await readJSON();
  db.products = db.products.filter((p) => p.id !== id);
  await writeJSON(db);
}
