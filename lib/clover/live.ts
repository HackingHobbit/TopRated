import 'server-only';

import type {
  CloverClient,
  CloverConnResult,
  CloverItem,
  CloverChargeInput,
  CloverChargeResult,
  CloverSettings,
  CloverSaveCardInput,
  CloverSaveCardResult,
  CloverStoredChargeInput,
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

  // Vault a card: creates a Clover Customer (or updates the existing one)
  // with the one-time card token as its payment source, per Clover's
  // "Save a card for future transactions" flow. Returns a multi-pay source
  // id we store (never the card number itself) for later charges.
  //
  // `sources` on the Customer response is a paginated list object
  // ({ object: 'list', data: [...] }), NOT a plain array — reading it as a
  // bare array (an earlier version of this code did exactly that) silently
  // produces an empty list. Confirmed against a real sandbox response:
  // `sources` is `{ object: 'list', data: [<cardId string>, ...] }` — the
  // entries are plain id strings, not objects, and the response carries no
  // brand/last4/expiry at all. This card-on-file endpoint and the merchant
  // Platform API (used for testConnection/listInventory) are two different
  // surfaces over the same account, so we do a best-effort follow-up lookup
  // against the Platform API purely to get display details — if that lookup
  // fails, the card is still successfully saved, it just shows generically.
  async saveCard(input: CloverSaveCardInput): Promise<CloverSaveCardResult> {
    if (!this.s.ecommPrivateKey) {
      return { ok: false, error: 'No Ecommerce private key configured.' };
    }
    try {
      const url = input.existingCustomerId
        ? `${ecommBase(this.s.environment)}/v1/customers/${encodeURIComponent(input.existingCustomerId)}`
        : `${ecommBase(this.s.environment)}/v1/customers`;
      const res = await fetch(url, {
        method: input.existingCustomerId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${this.s.ecommPrivateKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          source: input.cardToken,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error?.message || `Clover save-card failed (${res.status}).` };
      }
      const customerId = (data.customerId ?? data.id ?? input.existingCustomerId) as string | undefined;
      const sourcesRaw = data.sources;
      const sourceIds: string[] = Array.isArray(sourcesRaw)
        ? sourcesRaw
        : Array.isArray(sourcesRaw?.data)
          ? sourcesRaw.data
          : [];
      const sourceId = sourceIds[sourceIds.length - 1];
      if (!customerId || !sourceId) {
        return { ok: false, error: 'Clover did not return a saved card reference.' };
      }

      let brand: string | undefined;
      let last4: string | undefined;
      let expMonth: number | undefined;
      let expYear: number | undefined;
      if (this.s.merchantId && this.s.apiToken) {
        try {
          const platformRes = await fetch(
            `${platformBase(this.s.environment)}/v3/merchants/${encodeURIComponent(this.s.merchantId)}/customers/${encodeURIComponent(customerId)}?expand=cards`,
            { headers: this.platformHeaders(), signal: AbortSignal.timeout(10_000) }
          );
          if (platformRes.ok) {
            const pdata = await platformRes.json();
            const cards = (pdata?.cards?.elements ?? []) as Array<Record<string, unknown>>;
            const match = cards.find((c) => c.id === sourceId) ?? cards[cards.length - 1];
            if (match) {
              brand = match.cardType as string | undefined;
              last4 = match.last4 as string | undefined;
              const exp = String(match.expirationDate ?? ''); // Platform API format: "MMYY"
              if (exp.length === 4) {
                expMonth = Number(exp.slice(0, 2));
                expYear = 2000 + Number(exp.slice(2, 4));
              }
            }
          }
        } catch {
          /* display-only enrichment — the card is already saved either way */
        }
      }

      return { ok: true, customerId, sourceId, brand, last4, expMonth, expYear };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'save-card error' };
    }
  }

  // Charge a vaulted card. Confirmed working by direct testing against a
  // real sandbox (not from docs, which never state this plainly): `source`
  // is just the CUSTOMER id itself — not a separate `customer` field, and
  // not the card's own sub-id from the customer's `sources` list. Clover
  // charges whatever card is on file for that customer, which is exactly
  // why this only works when a customer has a single card — matching the
  // one-saved-card-per-customer model already used here. Every other
  // combination tried (customer field present as a string or object, the
  // sources[]-array card id as `source`) failed with errors that don't
  // match Clover's public docs.
  async chargeStoredCard(input: CloverStoredChargeInput): Promise<CloverChargeResult> {
    if (!this.s.ecommPrivateKey) {
      return { ok: false, error: 'No Ecommerce private key configured.' };
    }
    try {
      const res = await fetch(`${ecommBase(this.s.environment)}/v1/charges`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.s.ecommPrivateKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TopRatedCC/1.0',
          'x-forwarded-for': input.clientIp || '0.0.0.0',
        },
        body: JSON.stringify({
          amount: input.amountCents,
          currency: input.currency || 'usd',
          source: input.customerId,
          capture: true,
          ecomind: 'ecom',
          description: `Order ${input.orderNumber}`,
          stored_credentials: {
            sequence: 'SUBSEQUENT',
            is_scheduled: false,
            initiator: 'CARDHOLDER',
          },
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

  async deleteStoredCard(customerId: string, sourceId: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.s.ecommPrivateKey) {
      return { ok: false, error: 'No Ecommerce private key configured.' };
    }
    try {
      const url = `${ecommBase(this.s.environment)}/v1/customers/${encodeURIComponent(customerId)}/sources/${encodeURIComponent(sourceId)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.s.ecommPrivateKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data?.error?.message || `Clover delete-card failed (${res.status}).` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'delete-card error' };
    }
  }
}
