'use client';

import { useMemo, useState } from 'react';
import { Heart, Minus, Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { useWantList } from '@/contexts/WantListContext';
import styles from './page.module.css';

interface Props {
  product: Product;
}

const PER_ITEM_LIMIT = 3;

export default function ProductDetailClient({ product }: Props) {
  const { addToCart, cart } = useCart();
  const { isFavorite, toggleFavorite } = useWantList();

  const cartItem = useMemo(
    () => cart.find((item) => item.product.id === product.id),
    [cart, product.id]
  );
  const currentCartQty = cartItem?.quantity ?? 0;
  const maxAddable = Math.max(0, PER_ITEM_LIMIT - currentCartQty);
  const isAtMaxLimit = maxAddable === 0;

  // Clamp the in-page quantity selector to whatever's left, so the
  // selector can't ever ask the cart for more than it will accept.
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const effectiveQuantity = Math.min(selectedQuantity, Math.max(1, maxAddable));

  const handleAddToCart = () => {
    if (isAtMaxLimit) return;
    addToCart(product, effectiveQuantity);
    setSelectedQuantity(1);
  };

  const favorited = isFavorite(product.id);

  return (
    <>
      <div className={styles.stockStatus}>
        <span className={styles.statusDot}></span> In Stock and Ready to Ship
      </div>

      <div className={styles.quantitySelector}>
        <span className={styles.quantityLabel}>Quantity</span>
        <div className={styles.quantityControls}>
          <button
            type="button"
            onClick={() =>
              setSelectedQuantity((q) => Math.max(1, q - 1))
            }
            disabled={isAtMaxLimit || effectiveQuantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span aria-live="polite">{effectiveQuantity}</span>
          <button
            type="button"
            onClick={() =>
              setSelectedQuantity((q) => Math.min(maxAddable, q + 1))
            }
            disabled={isAtMaxLimit || effectiveQuantity >= maxAddable}
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>
        {currentCartQty > 0 && (
          <p className={styles.quantityHint}>
            {currentCartQty} already in cart (limit {PER_ITEM_LIMIT} per item).
          </p>
        )}
      </div>

      <div className={styles.addToCartRow}>
        <button
          className={`btn-primary ${styles.addToCartBtn}`}
          onClick={handleAddToCart}
          disabled={isAtMaxLimit}
        >
          {isAtMaxLimit
            ? `Max Cart Limit (${PER_ITEM_LIMIT}) Reached`
            : effectiveQuantity > 1
              ? `Add ${effectiveQuantity} to Cart`
              : 'Add to Cart'}
        </button>
        <button
          type="button"
          className={`${styles.favoriteBtn} ${favorited ? styles.favorited : ''}`}
          onClick={() => toggleFavorite(product)}
          aria-label={favorited ? 'Remove from want list' : 'Add to want list'}
          aria-pressed={favorited}
        >
          <Heart size={24} fill={favorited ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.guaranteeBox}>
        <h4>Top Rated Guarantee</h4>
        <p>100% Authentic products. Free shipping on orders over $300.</p>
      </div>
    </>
  );
}
