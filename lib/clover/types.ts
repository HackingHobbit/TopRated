// Shared Clover-integration types. Client-safe (no server-only imports) so the
// admin settings form can import them. The actual clients live in mock.ts /
// live.ts and are selected at runtime by index.ts based on saved settings.

export type CloverMode = 'mock' | 'live';
export type CloverEnv = 'sandbox' | 'production';

export interface CloverSettings {
  /** 'mock' = phantom Clover (simulated); 'live' = real Clover API. */
  mode: CloverMode;
  environment: CloverEnv;
  /** Clover merchant ID (mId) — scopes every Platform API request. */
  merchantId: string;
  /** Platform API bearer token (inventory/merchant). SECRET — server-only. */
  apiToken: string;
  /** Ecommerce public tokenization key (PAKMS). Safe for the browser. */
  ecommPublicKey: string;
  /** Ecommerce private token for server-side charges. SECRET — server-only. */
  ecommPrivateKey: string;
}

export const DEFAULT_CLOVER_SETTINGS: CloverSettings = {
  mode: 'mock',
  environment: 'sandbox',
  merchantId: '',
  apiToken: '',
  ecommPublicKey: '',
  ecommPrivateKey: '',
};

export interface CloverConnResult {
  ok: boolean;
  mode: CloverMode;
  message: string;
  merchantName?: string;
}

export interface CloverItem {
  id: string;
  name: string;
  price: number; // dollars
  sku?: string;
  stockCount?: number;
}

export interface CloverChargeInput {
  amountCents: number;
  currency?: string;
  orderNumber: string;
  /** A client-side card token (live mode). Absent in mock mode. */
  source?: string;
  /** Client IP — Clover requires x-forwarded-for on live charges. */
  clientIp?: string;
}

export interface CloverChargeResult {
  ok: boolean;
  chargeId?: string;
  status?: string;
  amountCents?: number;
  error?: string;
  /** true when produced by the phantom (mock) client. */
  simulated?: boolean;
}

// Admin Integrations UI shapes (kept here, not in the 'use server' actions
// file, which may only export async functions).
export interface CloverStatus {
  mode: CloverMode;
  environment: CloverEnv;
  merchantId: string;
  ecommPublicKey: string;
  apiTokenMasked: string;
  ecommPrivateKeyMasked: string;
  hasApiToken: boolean;
  hasEcommPrivateKey: boolean;
  effectiveMode: string;
  tableReady: boolean;
}

export interface SaveCloverInput {
  mode: CloverMode;
  environment: CloverEnv;
  merchantId: string;
  ecommPublicKey: string;
  /** Only persisted when non-empty (blank = keep existing secret). */
  apiToken?: string;
  ecommPrivateKey?: string;
}

export interface CloverSaveCardInput {
  /** One-time card token from Clover.js createToken() (requires CVV). */
  cardToken: string;
  email: string;
  firstName: string;
  lastName: string;
  /** If the customer already has a saved card, this replaces it. */
  existingCustomerId?: string;
}

export interface CloverSaveCardResult {
  ok: boolean;
  customerId?: string;
  sourceId?: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  error?: string;
}

export interface CloverStoredChargeInput {
  amountCents: number;
  currency?: string;
  orderNumber: string;
  customerId: string;
  sourceId: string;
  clientIp?: string;
}

export interface CloverClient {
  readonly mode: CloverMode;
  /** Lightweight credential/connectivity check for the admin "Test" button. */
  testConnection(): Promise<CloverConnResult>;
  /** Pull merchant inventory (used by a future "Sync from Clover" action). */
  listInventory(): Promise<CloverItem[]>;
  /** Charge an order. Mock simulates success; live hits the Ecommerce API. */
  createCharge(input: CloverChargeInput): Promise<CloverChargeResult>;
  /** Vault a card (Clover Customer + multi-pay token) for future charges. */
  saveCard(input: CloverSaveCardInput): Promise<CloverSaveCardResult>;
  /** Charge a previously-vaulted card — no CVV re-entry needed. */
  chargeStoredCard(input: CloverStoredChargeInput): Promise<CloverChargeResult>;
  /** Remove a vaulted card. */
  deleteStoredCard(customerId: string, sourceId: string): Promise<{ ok: boolean; error?: string }>;
}
