'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/pricing';
import styles from './page.module.css';

export default function CartPage() {
  const { cart, totalPrice, updateQuantity, removeFromCart } = useCart();
  const router = useRouter();

  const shippingRemaining = Math.max(FREE_SHIPPING_THRESHOLD - totalPrice, 0);

  if (cart.length === 0) {
    return (
      <div className={`container ${styles.cartContainer}`}>
        <div className={`glass-panel ${styles.emptyState}`}>
          <ShoppingBag size={48} className={styles.emptyIcon} />
          <h2>Your cart is empty</h2>
          <p>Browse the shop to find something worth collecting.</p>
          <Link href="/shop" className="btn-primary">
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.cartContainer}`}>
      <h1 className={styles.pageTitle}>Your Cart</h1>

      <div className={styles.cartLayout}>
        <div className={styles.itemsColumn}>
          {cart.map((item) => (
            <div key={item.product.id} className={`glass-panel ${styles.cartItem}`}>
              <Link href={`/shop/${item.product.id}`} className={styles.itemImageLink}>
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  width={100}
                  height={130}
                  className={styles.itemImage}
                  sizes="100px"
                />
              </Link>
              <div className={styles.itemDetails}>
                <Link href={`/shop/${item.product.id}`} className={styles.itemName}>
                  {item.product.name}
                </Link>
                <p className={styles.itemPrice}>${item.product.price.toFixed(2)}</p>
                <div className={styles.itemActions}>
                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className={styles.qtyBtn}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.qtySpan}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className={styles.qtyBtn}
                      disabled={item.quantity >= 3}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className={styles.removeBtn}
                    aria-label={`Remove ${item.product.name} from cart`}
                  >
                    <Trash2 size={16} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
              <div className={styles.itemLineTotal}>
                ${(item.product.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summaryColumn}>
          <div className={`glass-panel ${styles.summaryCard}`}>
            <h3>Order Summary</h3>

            <div className={styles.shippingBar}>
              <p className={styles.shippingText}>
                {shippingRemaining === 0
                  ? "🎉 You've unlocked Free Shipping!"
                  : `Only $${shippingRemaining.toFixed(2)} away from Free Shipping!`}
              </p>
              <div className={styles.progressContainer}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <p className={styles.taxesText}>Taxes and shipping calculated at checkout</p>

            <button
              className={`btn-primary ${styles.checkoutBtn}`}
              onClick={() => router.push('/checkout')}
            >
              Proceed to Checkout
            </button>
            <Link href="/shop" className={styles.continueLink}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
