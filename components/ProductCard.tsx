"use client";

import Link from 'next/link';
import { Product } from '@/lib/db';
import { useCart } from '@/contexts/CartContext';
import { useWantList } from '@/contexts/WantListContext';
import { Heart } from 'lucide-react';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart } = useCart();
  const { isFavorite, toggleFavorite } = useWantList();
  
  const cartItem = cart.find(item => item.product.id === product.id);
  const isAtMaxLimit = cartItem ? cartItem.quantity >= 3 : false;
  
  const favorited = isFavorite(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation when clicking add to cart
    if (!isAtMaxLimit) {
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
          <img 
            src={product.image} 
            alt={product.name} 
            className={styles.image} 
          />
          
          <button 
            className={`${styles.favoriteBtn} ${favorited ? styles.favorited : ''}`}
            onClick={handleToggleFavorite}
            aria-label={favorited ? "Remove from want list" : "Add to want list"}
          >
            <Heart size={20} fill={favorited ? "currentColor" : "none"} />
          </button>

          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.typeBadge}`}>
              {product.isSealed ? 'Sealed' : 'Single'}
            </span>
            {product.isSale && <span className={`${styles.badge} ${styles.saleBadge}`}>Sale</span>}
            {product.isPreOrder && <span className={`${styles.badge} ${styles.preOrderBadge}`}>Pre-Order</span>}
            {product.isNewRelease && <span className={`${styles.badge} ${styles.newBadge}`}>New</span>}
            {product.isLimited && <span className={`${styles.badge} ${styles.limitedBadge}`}>Limited</span>}
          </div>
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
          disabled={isAtMaxLimit}
        >
          {isAtMaxLimit ? 'Max Limit Reached' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
