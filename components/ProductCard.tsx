"use client";

import { Product } from '@/lib/db';
import { useCart } from '@/contexts/CartContext';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, cart } = useCart();
  
  const cartItem = cart.find(item => item.product.id === product.id);
  const isAtMaxLimit = cartItem ? cartItem.quantity >= 3 : false;

  const handleAddToCart = () => {
    if (!isAtMaxLimit) {
      addToCart(product);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <img 
          src={product.image} 
          alt={product.name} 
          className={styles.image} 
        />
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
      <div className={styles.content}>
        <h3 className={styles.title}>{product.name}</h3>
        <p className={styles.subTitle}>{product.subCategory} - {product.category}</p>
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
