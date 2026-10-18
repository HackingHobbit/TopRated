// Netlify scheduled function: once an hour, ask the site to pull products,
// prices and stock from the store's real Clover account. The work happens in
// app/api/cron/inventory-sync/route.ts; this only triggers it.
// Needs CRON_SECRET set in Netlify (Site configuration → Environment variables).

export default async function cloverInventorySync() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('[clover-inventory-sync] URL or CRON_SECRET not set');
    return;
  }
  const res = await fetch(`${base}/api/cron/inventory-sync`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
  console.log('[clover-inventory-sync]', res.status, await res.text());
}

export const config = { schedule: '@hourly' };
