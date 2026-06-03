'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

interface ShippingDetails {
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  // Order id is generated ONCE when the order is placed and stored in
  // state, so it doesn't change on every re-render the way the previous
  // `Math.random()` in render did.
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

  const handlePlaceOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);

    // Collect form values. Card data is intentionally not stored — in the
    // real app this would be tokenized by Clover's iframe and never touch
    // our backend (per docs/SPECIFICATION.md §B "Secure Vaulting").
    const data = new FormData(e.currentTarget);
    const shipping: ShippingDetails = {
      fullName: String(data.get('fullName') ?? ''),
      address: String(data.get('address') ?? ''),
      city: String(data.get('city') ?? ''),
      state: String(data.get('state') ?? ''),
      zip: String(data.get('zip') ?? ''),
    };

    const newOrderId = `TR-${Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')}`;

    // Simulate API delay
    setTimeout(() => {
      setOrderId(newOrderId);
      setShippingDetails(shipping);
      setIsProcessing(false);
      clearCart();
      setStep(3);
    }, 2000);
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
                <h3>2. Payment Method (Mock)</h3>
                <p className={styles.mockNotice}>
                  Note: Real payment integration (Clover) will be implemented
                  in Phase 5. Card details entered here are never stored.
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
