'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { placeOrder, type ShippingDetails } from '@/lib/orderActions';
import { getCloverCheckoutConfig, type CloverCheckoutConfig } from '@/lib/cloverActions';
import { listMyAddresses, type SavedAddress } from '@/lib/addressActions';
import { listMyPaymentMethods, type SavedCard } from '@/lib/paymentMethodActions';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING, TAX_RATE, round2 } from '@/lib/pricing';
import styles from './page.module.css';

const CLOVER_SDK_URL: Record<CloverCheckoutConfig['environment'], string> = {
  sandbox: 'https://checkout.sandbox.dev.clover.com/sdk.js',
  production: 'https://checkout.clover.com/sdk.js',
};

type CloverFieldType = 'CARD_NUMBER' | 'CARD_DATE' | 'CARD_CVV' | 'CARD_POSTAL_CODE';

interface CloverElement {
  mount(selector: string): void;
}
interface CloverElements {
  create(type: CloverFieldType, style?: Record<string, unknown>): CloverElement;
}
interface CloverInstance {
  elements(): CloverElements;
  createToken(): Promise<{ token?: string; errors?: Record<string, string> }>;
}

declare global {
  interface Window {
    Clover?: new (apiAccessKey: string, opts: { merchantId: string }) => CloverInstance;
  }
}

// Clover's style object uses camelCase CSS-in-JS property names (confirmed
// via docs.clover.com), not kebab-case — and the iframe defaults to a white
// background, so it must be set explicitly to match our dark theme.
const CLOVER_FIELD_STYLE = {
  input: {
    fontSize: '16px',
    color: '#f5f5f5',
    // Matches --bg-primary (app/globals.css) — the iframe defaults to a
    // white background, so it must be set explicitly, not left transparent.
    backgroundColor: '#08090d',
  },
};

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => reject(new Error('Could not load the Clover payment SDK.')));
    document.head.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The real order number comes back from the server (a persisted order),
  // not a client-side Math.random().
  const [orderId, setOrderId] = useState<string | null>(null);
  const [shippingDetails, setShippingDetails] =
    useState<ShippingDetails | null>(null);

  const [cloverConfig, setCloverConfig] = useState<CloverCheckoutConfig | null>(null);
  const [cloverFieldsReady, setCloverFieldsReady] = useState(false);
  const [cloverLoadError, setCloverLoadError] = useState<string | null>(null);
  const cloverRef = useRef<CloverInstance | null>(null);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  const [paymentMethods, setPaymentMethods] = useState<SavedCard[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('new');
  const [saveCard, setSaveCard] = useState(false);

  // Non-secret checkout config (mode/environment/merchantId/public key) —
  // needed before the customer is logged in, so this is a public action.
  useEffect(() => {
    let cancelled = false;
    getCloverCheckoutConfig().then((cfg) => {
      if (!cancelled) setCloverConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Saved addresses/cards only exist for signed-in customers.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    listMyAddresses().then((list) => {
      if (cancelled) return;
      setAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setSelectedAddressId(def.id);
    });
    listMyPaymentMethods().then((list) => {
      if (cancelled) return;
      setPaymentMethods(list);
      const def = list.find((c) => c.isDefault) ?? list[0];
      if (def) setSelectedPaymentId(def.id);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Once we know we're in live mode, load Clover's hosted-iframe SDK and mount
  // the card fields. The PAN/CVC are typed directly into Clover's iframes and
  // never touch our own inputs or server — createToken() is the only bridge.
  useEffect(() => {
    if (!cloverConfig || cloverConfig.mode !== 'live') return;
    let cancelled = false;

    loadScriptOnce(CLOVER_SDK_URL[cloverConfig.environment])
      .then(() => {
        if (cancelled || !window.Clover) return;
        const clover = new window.Clover(cloverConfig.ecommPublicKey, {
          merchantId: cloverConfig.merchantId,
        });
        const elements = clover.elements();
        elements.create('CARD_NUMBER', CLOVER_FIELD_STYLE).mount('#clover-card-number');
        elements.create('CARD_DATE', CLOVER_FIELD_STYLE).mount('#clover-card-date');
        elements.create('CARD_CVV', CLOVER_FIELD_STYLE).mount('#clover-card-cvv');
        elements.create('CARD_POSTAL_CODE', CLOVER_FIELD_STYLE).mount('#clover-card-postal');
        cloverRef.current = clover;
        if (!cancelled) setCloverFieldsReady(true);
      })
      .catch((e) => {
        if (!cancelled) setCloverLoadError(e instanceof Error ? e.message : 'Could not load payment form.');
      });

    return () => {
      cancelled = true;
    };
  }, [cloverConfig]);

  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const tax = round2(totalPrice * TAX_RATE);
  const grandTotal = round2(totalPrice + shippingCost + tax);

  // If cart is empty and we haven't successfully ordered, redirect
  if (cart.length === 0 && step !== 3) {
    return (
      <div
        className="container"
        style={{ padding: '4rem 0', textAlign: 'center' }}
      >
        <h2>Your cart is empty</h2>
        <button
          onClick={() => router.push('/shop')}
          className="btn-primary"
          style={{ marginTop: '1rem' }}
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const usingSavedCard = selectedPaymentId !== 'new' && paymentMethods.some((c) => c.id === selectedPaymentId);
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const handlePlaceOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const shipping: ShippingDetails = {
      fullName: String(data.get('fullName') ?? ''),
      address: String(data.get('address') ?? ''),
      city: String(data.get('city') ?? ''),
      state: String(data.get('state') ?? ''),
      zip: String(data.get('zip') ?? ''),
    };

    const items = cart.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
    }));

    let cardToken: string | undefined;
    if (cloverConfig?.mode === 'live' && !usingSavedCard) {
      if (!cloverRef.current) {
        setError('The payment form is still loading — please wait a moment and try again.');
        return;
      }
      setIsProcessing(true);
      const result = await cloverRef.current.createToken();
      if (result.errors || !result.token) {
        setIsProcessing(false);
        setError(Object.values(result.errors ?? {})[0] || 'Please check your card details.');
        return;
      }
      cardToken = result.token;
    }

    setIsProcessing(true);
    const res = await placeOrder(items, shipping, cardToken, {
      savedPaymentMethodId: usingSavedCard ? selectedPaymentId : undefined,
      saveCard: !usingSavedCard && saveCard,
    });
    setIsProcessing(false);
    if (!res.ok) {
      setError(res.error ?? 'Sorry, we couldn’t place your order.');
      return;
    }
    setOrderId(res.orderNumber ?? null);
    setShippingDetails(shipping);
    clearCart();
    setStep(3);
  };

  return (
    <div className={`container ${styles.checkoutContainer}`}>
      {step === 3 ? (
        <div className={`glass-panel ${styles.successCard}`}>
          <h2>🎉 Order Placed Successfully!</h2>
          <p>
            Thank you for your purchase,{' '}
            {shippingDetails?.fullName || user?.name || 'Guest'}.
          </p>
          {orderId && (
            <p className={styles.orderId}>Order #{orderId}</p>
          )}
          <button
            onClick={() => router.push('/account')}
            className="btn-primary"
            style={{ marginTop: '2rem' }}
          >
            View Order History
          </button>
        </div>
      ) : (
        <div className={styles.checkoutLayout}>
          <div className={styles.formColumn}>
            <h2>Checkout</h2>

            {!isAuthenticated && (
              <p className={styles.mockNotice}>
                <strong>Have an account?</strong>{' '}
                <Link href="/login?redirect=/checkout">Sign in</Link> for
                faster checkout with saved addresses and payment methods, or{' '}
                <Link href="/signup">create one</Link> — or just continue
                below as a guest.
              </p>
            )}

            <form onSubmit={handlePlaceOrder} className={styles.checkoutForm}>
              <div className={styles.formSection}>
                <h3>1. Shipping Information</h3>

                {addresses.length > 0 && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="savedAddress">Use a saved address</label>
                    <select
                      id="savedAddress"
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label || a.address} — {a.city}, {a.state}
                        </option>
                      ))}
                      <option value="new">Enter a new address</option>
                    </select>
                  </div>
                )}

                {/* Re-keying on the selection remounts these inputs with fresh
                    defaultValue — simplest way to "autofill" an uncontrolled form. */}
                <div key={selectedAddressId}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      defaultValue={selectedAddress?.fullName || user?.name || ''}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="address">Address</label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      defaultValue={selectedAddress?.address || ''}
                      autoComplete="street-address"
                      required
                    />
                  </div>
                  <div className={styles.inputRow}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="city">City</label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        defaultValue={selectedAddress?.city || ''}
                        autoComplete="address-level2"
                        required
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label htmlFor="state">State</label>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        defaultValue={selectedAddress?.state || ''}
                        autoComplete="address-level1"
                        required
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label htmlFor="zip">ZIP Code</label>
                      <input
                        id="zip"
                        name="zip"
                        type="text"
                        defaultValue={selectedAddress?.zip || ''}
                        autoComplete="postal-code"
                        inputMode="numeric"
                        pattern="\d{5}(-\d{4})?"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>2. Payment Method</h3>

                {cloverConfig === null && (
                  <p className={styles.mockNotice}>Loading payment form…</p>
                )}

                {cloverConfig?.mode === 'live' && paymentMethods.length > 0 && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="savedCard">Use a saved card</label>
                    <select
                      id="savedCard"
                      value={selectedPaymentId}
                      onChange={(e) => setSelectedPaymentId(e.target.value)}
                    >
                      {paymentMethods.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.brand} •••• {c.last4}
                          {c.expMonth && c.expYear ? ` (exp ${c.expMonth}/${c.expYear})` : ''}
                        </option>
                      ))}
                      <option value="new">Use a new card</option>
                    </select>
                  </div>
                )}

                {cloverConfig?.mode === 'mock' && (
                  <>
                    <p className={styles.mockNotice}>
                      Payments run through the Clover integration. It&apos;s in{' '}
                      <strong>phantom (mock) mode</strong> right now — orders are
                      simulated and no card is charged. An admin can switch it to
                      live Clover under <strong>Admin → Integrations</strong>. Card
                      details entered here are never stored.
                    </p>
                    <div className={styles.inputGroup}>
                      <label htmlFor="cardNumber">Card Number</label>
                      <input
                        id="cardNumber"
                        name="cardNumber"
                        type="text"
                        autoComplete="off"
                        inputMode="numeric"
                        placeholder="•••• •••• •••• ••••"
                        required
                      />
                    </div>
                    <div className={styles.inputRow}>
                      <div className={styles.inputGroup}>
                        <label htmlFor="cardExpiry">Expiry (MM/YY)</label>
                        <input
                          id="cardExpiry"
                          name="cardExpiry"
                          type="text"
                          autoComplete="off"
                          placeholder="12/25"
                          required
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor="cardCvc">CVC</label>
                        <input
                          id="cardCvc"
                          name="cardCvc"
                          type="text"
                          autoComplete="off"
                          inputMode="numeric"
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {cloverConfig?.mode === 'live' && !usingSavedCard && (
                  <>
                    <p className={styles.mockNotice}>
                      Payments are processed securely by Clover. Your card
                      details are entered directly into Clover&apos;s secure
                      fields and never touch our servers.
                    </p>
                    {cloverLoadError && (
                      <p style={{ color: 'var(--accent-red)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        {cloverLoadError}
                      </p>
                    )}
                    {!cloverFieldsReady && !cloverLoadError && (
                      <p className={styles.mockNotice}>Loading secure payment fields…</p>
                    )}
                    <div className={styles.inputGroup} style={{ display: cloverFieldsReady ? 'block' : 'none' }}>
                      <label htmlFor="clover-card-number">Card Number</label>
                      <div id="clover-card-number" className={styles.cloverField} />
                    </div>
                    <div
                      className={styles.inputRow}
                      style={{ display: cloverFieldsReady ? 'flex' : 'none' }}
                    >
                      <div className={styles.inputGroup}>
                        <label htmlFor="clover-card-date">Expiry (MM/YY)</label>
                        <div id="clover-card-date" className={styles.cloverField} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor="clover-card-cvv">CVC</label>
                        <div id="clover-card-cvv" className={styles.cloverField} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor="clover-card-postal">ZIP</label>
                        <div id="clover-card-postal" className={styles.cloverField} />
                      </div>
                    </div>
                    {isAuthenticated && (
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                        />
                        Save this card for next time
                      </label>
                    )}
                  </>
                )}
              </div>

              {error && (
                <p
                  style={{
                    color: 'var(--accent-red)',
                    marginBottom: '0.75rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className={`btn-primary ${styles.submitBtn}`}
                disabled={isProcessing || cloverConfig === null}
              >
                {isProcessing ? 'Processing...' : `Pay $${grandTotal.toFixed(2)}`}
              </button>
            </form>
          </div>

          <div className={styles.summaryColumn}>
            <div className={`glass-panel ${styles.summaryCard}`}>
              <h3>Order Summary</h3>
              <div className={styles.summaryItems}>
                {cart.map((item) => (
                  <div key={item.product.id} className={styles.summaryItem}>
                    <div className={styles.summaryItemInfo}>
                      <span className={styles.summaryQty}>
                        {item.quantity}x
                      </span>
                      <span>{item.product.name}</span>
                    </div>
                    <span>
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.summaryTotals}>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div
                  className={`${styles.summaryRow} ${styles.finalTotal}`}
                >
                  <span>Total</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
