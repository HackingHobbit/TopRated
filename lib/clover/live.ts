import 'server-only';

import type {
  CloverClient,
  CloverConnResult,
  CloverItem,
  CloverChargeInput,
  CloverChargeResult,
  CloverSettings,
} from './types';

// Real Clover API client. Endpoints/hosts per Clover's developer docs:
//   Platform API:   https://api.clover.com            (production)
//                   https://apisandbox.dev.clover.com (sandbox)
//   Ecommerce API:  https://scl.clover.com            (production)
//                   https://scl-sandbox.dev.clover.com(sandbox)
// The Platform token authorizes merchant/inventory reads; the Ecommerce
// PRIVATE token authorizes server-side charges (cards are tokenized in the
// browser with the PUBLIC key first). Only reachable when the merchant has
// entered real credentials and flipped mode -> 'live'.
function platformBase(env: CloverSettings['environment']): string {
  return env === 'production' ? 'https://api.clover.com' : 'https://apisandbox.dev.clover.com';
}
function ecommBase(env: CloverSettings['environment']): string {
  return env === 'production' ? 'https://scl.clover.com' : 'https://scl-sandbox.dev.clover.com';
}

export class LiveCloverClient implements CloverClient {
  readonly mode = 'live' as const;
  constructor(private readonly s: CloverSettings) {}

  private platformHeaders() {
    return { Authorization: `Bearer ${this.s.apiToken}`, Accept: 'application/json' };
  }

  async testConnection(): Promise<CloverConnResult> {
    if (!this.s.merchantId || !this.s.apiToken) {
      return { ok: false, mode: 'live', message: 'Missing merchant ID or API token.' };
    }
    try {
      const url = `${platformBase(this.s.environment)}/v3/merchants/${encodeURIComponent(this.s.merchantId)}`;
      const res = await fetch(url, { headers: this.platformHeaders(), signal: AbortSignal.timeout(12_000), cache: 'no-store' });
      if (!res.ok) {
        return { ok: false, mode: 'live', message: `Clover returned ${res.status} ${res.statusText}. Check merchant ID + API token + environment.` };
      }
      const m = await res.json();
      return { ok: true, mode: 'live', message: `Connected to Clover (${this.s.environment}).`, merchantName: m?.name || '(unnamed merchant)' };
    } catch (e) {
      return { ok: false, mode: 'live', message: `Could not reach Clover: ${e instanceof Error ? e.message : 'error'}.` };
    }
  }

  async listInventory(): Promise<CloverItem[]> {
    if (!this.s.merchantId || !this.s.apiToken) return [];
    try {
      const url = `${platformBase(this.s.environment)}/v3/merchants/${encodeURIComponent(this.s.merchantId)}/items?limit=100&expand=itemStock`;
      const res = await fetch(url, { headers: this.platformHeaders(), signal: AbortSignal.timeout(15_000), cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.elements ?? []).map((it: Record<string, unknown>) => ({
        id: String(it.id),
        name: String(it.name ?? ''),
        // Clover item prices are integer cents.
        price: typeof it.price === 'number' ? it.price / 100 : 0,
        sku: (it.sku as string) || (it.code as string) || undefined,
        // Prefer itemStock.quantity; stockCount is deprecated in the Clover API.
        stockCount: (it.itemStock as { quantity?: number; stockCount?: number } | undefined)?.quantity
          ?? (it.itemStock as { stockCount?: number } | undefined)?.stockCount,
      }));
    } catch {
      return [];
    }
  }

  async createCharge(input: CloverChargeInput): Promise<CloverChargeResult> {
    if (!this.s.ecommPrivateKey) {
      return { ok: false, error: 'No Ecommerce private key configured for live charges.' };
    }
    if (!input.source) {
      // Real charges require a card token created in the browser with the
      // PUBLIC key (PAKMS). Without it we can't charge — surface it clearly
      // rather than silently failing.
      return { ok: false, error: 'Live charge needs a card token (client-side tokenization with the public key) — not yet wired into checkout.' };
    }
    try {
      const res = await fetch(`${ecommBase(this.s.environment)}/v1/charges`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.s.ecommPrivateKey}`,
          'Content-Type': 'application/json',
          // Clover requires these on charge requests.
          'User-Agent': 'TopRatedCC/1.0',
          'x-forwarded-for': input.clientIp || '0.0.0.0',
        },
        body: JSON.stringify({
          amount: input.amountCents,
          currency: input.currency || 'usd',
          source: input.source,
          capture: true,
          ecomind: 'ecom',
          description: `Order ${input.orderNumber}`,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error?.message || `Clover charge failed (${res.status}).` };
      }
      return { ok: true, chargeId: data.id, status: data.status, amountCents: data.amount };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'charge error' };
    }
  }
}
