"use client";

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './CartDrawer.module.css';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

export default function CartDrawer() {
  const { isCartOpen, toggleCart, cart, updateQuantity, removeFromCart, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    toggleCart(); // Close drawer
    if (isAuthenticated) {
      router.push('/checkout');
    } else {
      router.push('/login');
    }
  };

  const SHIPPING_THRESHOLD = 300;
  const progress = Math.min((totalPrice / SHIPPING_THRESHOLD) * 100, 100);
  const remainingForFreeShipping = Math.max(SHIPPING_THRESHOLD - totalPrice, 0);

  if (!isCartOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={toggleCart} />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <h2>Your Cart</h2>
          <button className={styles.closeBtn} onClick={toggleCart}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.shippingBar}>
          <p className={styles.shippingText}>
            {remainingForFreeShipping === 0 
              ? "🎉 You've unlocked Free Shipping!" 
              : `Only $${remainingForFreeShipping.toFixed(2)} away from Free Shipping!`}
          </p>
          <div className={styles.progressContainer}>
            <div 
              className={styles.progressBar} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.emptyCart}>
              <ShoppingBag size={48} className={styles.emptyIcon} />
              <p>Your cart is empty.</p>
              <button className={styles.continueBtn} onClick={toggleCart}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className={styles.cartItem}>
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  className={styles.itemImage}
                  width={120}
                  height={160}
                  sizes="80px"
                />
                <div className={styles.itemDetails}>
                  <h3 className={styles.itemName}>{item.product.name}</h3>
                  <p className={styles.itemPrice}>${item.product.price.toFixed(2)}</p>
                  
                  <div className={styles.itemActions}>
                    <div className={styles.quantityControls}>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className={styles.qtyBtn}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={styles.qtySpan}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className={styles.qtyBtn}
                        disabled={item.quantity >= 3}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className={styles.removeBtn}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.totals}>
              <span>Subtotal</span>
              <span className={styles.totalPrice}>${totalPrice.toFixed(2)}</span>
            </div>
            <p className={styles.taxesText}>Taxes and shipping calculated at checkout</p>
            <button className={styles.checkoutBtn} onClick={handleCheckout}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
