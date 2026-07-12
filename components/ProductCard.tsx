"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { useWantList } from '@/contexts/WantListContext';
import { Heart, Info } from 'lucide-react';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart } = useCart();
  const { isFavorite, toggleFavorite } = useWantList();
  
  const cartItem = cart.find(item => item.product.id === product.id);
  const isAtMaxLimit = cartItem ? cartItem.quantity >= 3 : false;
  const outOfStock = product.isOutOfStock;
  const cannotAdd = isAtMaxLimit || outOfStock;

  const favorited = isFavorite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation when clicking add to cart
    if (!cannotAdd) {
      addToCart(product);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleFavorite(product);
  };

  return (
    <div className={styles.card}>
      <Link href={`/shop/${product.id}`} style={{ display: 'contents' }}>
        <div className={styles.imageContainer}>
          <Image
            src={product.image}
            alt={product.name}
            className={styles.image}
            width={600}
            height={800}
            sizes="(max-width: 600px) 50vw, (max-width: 1200px) 25vw, 300px"
          />
          
          <button 
            className={`${styles.favoriteBtn} ${favorited ? styles.favorited : ''}`}
            onClick={handleToggleFavorite}
            aria-label={favorited ? "Remove from want list" : "Add to want list"}
          >
            <Heart size={20} fill={favorited ? "currentColor" : "none"} />
          </button>

          <div className={styles.badges}>
            {/* Type badge only renders for actual sealed-card categories
                — for accessories, beverages, memorabilia, entertainment
                a "Sealed"/"Single" label would be misleading. */}
            {(product.category === 'sports' || product.category === 'tcg') && (
              <span className={`${styles.badge} ${styles.typeBadge}`}>
                {product.isSealed ? 'Sealed' : 'Single'}
              </span>
            )}
            {product.isOutOfStock && (
              <span className={`${styles.badge} ${styles.saleBadge}`}>Out of Stock</span>
            )}
            {product.isSale && <span className={`${styles.badge} ${styles.saleBadge}`}>Sale</span>}
            {product.isPreOrder && <span className={`${styles.badge} ${styles.preOrderBadge}`}>Pre-Order</span>}
            {product.isNewRelease && <span className={`${styles.badge} ${styles.newBadge}`}>New</span>}
            {product.isLimited && <span className={`${styles.badge} ${styles.limitedBadge}`}>Limited</span>}
          </div>

          {product.imageRepresentative && (
            <span
              className={styles.repChip}
              title="The image shown is representative — the exact item may vary in appearance."
            >
              <Info size={12} aria-hidden />
              Representative image
            </span>
          )}
        </div>
      </Link>
      <div className={styles.content}>
        <Link href={`/shop/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className={styles.title}>{product.name}</h3>
          <p className={styles.subTitle}>{product.subCategory} - {product.category}</p>
        </Link>
        <p className={styles.price}>${product.price.toFixed(2)}</p>
        <button
          className={`btn-primary ${styles.addToCart}`}
          onClick={handleAddToCart}
          disabled={cannotAdd}
        >
          {outOfStock
            ? 'Out of Stock'
            : isAtMaxLimit
              ? 'Max Limit Reached'
              : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
