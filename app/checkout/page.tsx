"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // If cart is empty and we haven't successfully ordered, redirect
  if (cart.length === 0 && step !== 3) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Your cart is empty</h2>
        <button onClick={() => router.push('/shop')} className="btn-primary" style={{ marginTop: '1rem' }}>
          Back to Shop
        </button>
      </div>
    );
  }

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate API delay
    setTimeout(() => {
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
          <p>Thank you for your purchase, {user?.name || 'Guest'}.</p>
          <p className={styles.orderId}>Order #TR-{Math.floor(Math.random() * 100000)}</p>
          <button onClick={() => router.push('/account')} className="btn-primary" style={{ marginTop: '2rem' }}>
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
                  <label>Full Name</label>
                  <input type="text" defaultValue={user?.name || ''} required />
                </div>
                <div className={styles.inputGroup}>
                  <label>Address</label>
                  <input type="text" required />
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>City</label>
                    <input type="text" required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>State</label>
                    <input type="text" required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>ZIP Code</label>
                    <input type="text" required />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3>2. Payment Method (Mock)</h3>
                <p className={styles.mockNotice}>
                  Note: Real payment integration (Clover) will be implemented in Phase 5.
                </p>
                <div className={styles.inputGroup}>
                  <label>Card Number</label>
                  <input type="text" placeholder="•••• •••• •••• ••••" required />
                </div>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup}>
                    <label>Expiry (MM/YY)</label>
                    <input type="text" placeholder="12/25" required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>CVC</label>
                    <input type="text" placeholder="123" required />
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
                      <span className={styles.summaryQty}>{item.quantity}x</span>
                      <span>{item.product.name}</span>
                    </div>
                    <span>${(item.product.price * item.quantity).toFixed(2)}</span>
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
                <div className={`${styles.summaryRow} ${styles.finalTotal}`}>
                  <span>Total</span>
                  <span>${(totalPrice + (totalPrice >= 300 ? 0 : 9.99)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
