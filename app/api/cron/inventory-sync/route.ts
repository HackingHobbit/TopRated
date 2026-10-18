import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { runSavedInventorySync } from '@/lib/clover/inventorySync';

// Hourly Clover → website inventory sync, called by the Netlify scheduled
// function in netlify/functions/clover-inventory-sync.mts. Protected by the
// CRON_SECRET environment variable (Netlify site settings).

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return Response.json({ ok: false, error: 'Supabase service key not configured.' }, { status: 500 });

  try {
    const r = await runSavedInventorySync(admin, true);
    revalidatePath('/', 'layout');
    const summary = {
      ok: true,
      cloverItems: r.cloverItems,
      priceChanges: r.priceChanges.length,
      nowOutOfStock: r.nowOutOfStock.length,
      backInStock: r.backInStock.length,
      stockCounts: r.quantityUpdates,
      added: r.added.length,
      removedFromClover: r.removedFromClover.length,
      skipped: r.skipped.length,
      warning: r.warning,
    };
    console.log('[inventory-sync]', JSON.stringify(summary));
    return Response.json(summary);
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Sync failed.';
    console.error('[inventory-sync]', error);
    return Response.json({ ok: false, error }, { status: 500 });
  }
}
