import 'server-only';

import { randomUUID } from 'crypto';
import type {
  CloverClient,
  CloverConnResult,
  CloverItem,
  CloverChargeInput,
  CloverChargeResult,
} from './types';

// Phantom Clover. Behaves like a connected merchant so the whole app flow
// (test connection, inventory, checkout charge) works end-to-end with NO real
// Clover account. Swapping to the real thing is just flipping mode -> 'live'
// in the admin Integrations page (see lib/clover/live.ts).
export class MockCloverClient implements CloverClient {
  readonly mode = 'mock' as const;

  async testConnection(): Promise<CloverConnResult> {
    return {
      ok: true,
      mode: 'mock',
      message:
        'Phantom Clover active — simulated merchant, no real connection. ' +
        'Enter credentials and switch to Live to use the real Clover API.',
      merchantName: 'Top Rated Cards & Collectibles (Phantom Merchant)',
    };
  }

  async listInventory(): Promise<CloverItem[]> {
    // A small, obviously-fake sample so it's clear this is simulated data.
    return [
      { id: 'mock_itm_1', name: '2025 Topps Chrome Hobby Box (phantom)', price: 299.99, sku: 'PHNTM-001', stockCount: 12 },
      { id: 'mock_itm_2', name: 'Pokémon Booster Bundle (phantom)', price: 27.99, sku: 'PHNTM-002', stockCount: 40 },
      { id: 'mock_itm_3', name: 'Ultra Pro Toploaders 35pt (phantom)', price: 8.99, sku: 'PHNTM-003', stockCount: 100 },
    ];
  }

  async createCharge(input: CloverChargeInput): Promise<CloverChargeResult> {
    // Always succeeds — it's a simulation. The charge id is clearly marked mock
    // so it can never be mistaken for a real Clover charge.
    return {
      ok: true,
      chargeId: `mock_ch_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      status: 'succeeded',
      amountCents: input.amountCents,
      simulated: true,
    };
  }
}
