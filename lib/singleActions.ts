'use server';

// CRUD for individual ("single") cards. Singles are products with
// is_sealed=false plus a single_details row and one or more product_images.
// All writes go through the admin SESSION client; RLS (0002) restricts them
// to admins. Photo files are already in Storage by the time these run — we
// only persist their URLs here.

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from './supabase/server';
import { assertAdmin } from './auth-guard';
import { SUPABASE_URL } from './supabase/env';
import type { UploadedImage } from './types';

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface SingleInput {
  name: string;
  description: string;
  price: number;
  categoryId: string; // subCategory id referencing categories(id)
  subject: string;
  cardSet: string;
  year: number | null;
  cardNumber: string;
  condition: string;
  isGraded: boolean;
  grader: string;
  grade: string;
  certNumber: string;
  images: UploadedImage[]; // ordered; [0] is primary
  isFeatured?: boolean;
  isSale?: boolean;
  isNewRelease?: boolean;
  isLimited?: boolean;
  isOutOfStock?: boolean;
}

function detailRow(id: string, input: SingleInput) {
  return {
    product_id: id,
    subject: input.subject || null,
    card_set: input.cardSet || null,
    year: input.year,
    card_number: input.cardNumber || null,
    condition: input.condition || null,
    is_graded: input.isGraded,
    grader: input.grader || null,
    grade: input.grade || null,
    cert_number: input.certNumber || null,
  };
}

function imageRows(id: string, images: UploadedImage[]) {
  return images.map((img, i) => ({
    product_id: id,
    url: img.url,
    position: i,
    is_primary: i === 0,
  }));
}

function productRow(id: string, input: SingleInput) {
  return {
    id,
    name: input.name,
    description: input.description,
    price: input.price,
    image: input.images[0]?.url ?? '',
    category_id: input.categoryId,
    is_sealed: false,
    quantity: 1,
    is_sale: !!input.isSale,
    is_featured: !!input.isFeatured,
    is_new_release: !!input.isNewRelease,
    is_out_of_stock: !!input.isOutOfStock,
    is_limited: !!input.isLimited,
    is_pre_order: false,
  };
}

function revalidate(id?: string) {
  revalidatePath('/admin/singles');
  revalidatePath('/shop');
  if (id) revalidatePath(`/shop/${id}`);
}

export async function createSingle(input: SingleInput): Promise<ActionResult> {
  await assertAdmin();
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return { ok: false, error: 'Supabase unavailable.' };

    const id = `sng_${randomUUID()}`;
    const { error: pErr } = await supabase
      .from('products')
      .insert(productRow(id, input));
    if (pErr) return { ok: false, error: pErr.message };

    const { error: dErr } = await supabase
      .from('single_details')
      .insert(detailRow(id, input));
    if (dErr) return { ok: false, error: dErr.message };

    if (input.images.length) {
      const { error: iErr } = await supabase
        .from('product_images')
        .insert(imageRows(id, input.images));
      if (iErr) return { ok: false, error: iErr.message };
    }
    revalidate(id);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

export async function updateSingle(
  id: string,
  input: SingleInput
): Promise<ActionResult> {
  await assertAdmin();
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return { ok: false, error: 'Supabase unavailable.' };

    const { id: _omit, ...rest } = productRow(id, input);
    void _omit;
    const { error: pErr } = await supabase
      .from('products')
      .update(rest)
      .eq('id', id);
    if (pErr) return { ok: false, error: pErr.message };

    const { error: dErr } = await supabase
      .from('single_details')
      .upsert(detailRow(id, input));
    if (dErr) return { ok: false, error: dErr.message };

    // Replace the image set with the current ordered list.
    await supabase.from('product_images').delete().eq('product_id', id);
    if (input.images.length) {
      const { error: iErr } = await supabase
        .from('product_images')
        .insert(imageRows(id, input.images));
      if (iErr) return { ok: false, error: iErr.message };
    }
    revalidate(id);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

export async function deleteSingle(id: string): Promise<ActionResult> {
  await assertAdmin();
  try {
    const supabase = await getSupabaseServer();
    if (!supabase) return { ok: false, error: 'Supabase unavailable.' };

    // Gather image paths for best-effort Storage cleanup before the cascade.
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .eq('product_id', id);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    const paths = (imgs ?? [])
      .map((r: { url: string }) => storagePathFromUrl(r.url))
      .filter((p): p is string => Boolean(p));
    if (paths.length) {
      await supabase.storage.from('product-images').remove(paths).catch(() => {});
    }
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' };
  }
}

/** Extract the storage object path from a public URL, or null if not ours. */
function storagePathFromUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/product-images/';
  const i = url.indexOf(marker);
  if (i === -1 || !url.startsWith(SUPABASE_URL)) return null;
  return url.slice(i + marker.length);
}
