'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { placeOrder, type ShippingDetails } from '@/lib/orderActions';
import styles from './page.module.css';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The real order number comes back from the server (a persisted order),
  // not a client-side Math.random().
  const [orderId, setOrderId] = useState<string | null>(null);
  const [shippingDetails, setShippingDetails] =
    useState<ShippingDetails | null>(null);

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

  const handlePlaceOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    // Collect shipping. Card data is intentionally not stored — real payment
    // (Clover, Phase A2) will tokenize it client-side; for now the order is
    // persisted with status 'pending'.
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

    const res = await placeOrder(items, shipping);
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

            <form onSubmit={handlePlaceOrder} className={styles.checkoutForm}>
              <div className={styles.formSection}>
                <h3>1. Shipping Information</h3>
                <div className={styles.inputGroup}>
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    defaultValue={user?.name || ''}
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
                      autoComplete="postal-code"
                      inputMode="numeric"
                      pattern="\d{5}(-\d{4})?"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>2. Payment Method</h3>
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
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
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
                  <span>{totalPrice >= 300 ? 'Free' : '$9.99'}</span>
                </div>
                <div
                  className={`${styles.summaryRow} ${styles.finalTotal}`}
                >
                  <span>Total</span>
                  <span>
                    $
                    {(totalPrice + (totalPrice >= 300 ? 0 : 9.99)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
