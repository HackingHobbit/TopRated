import type { Product } from '../lib/db';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }: { product: Product }) {
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
        <p className={styles.price}>${product.price.toFixed(2)}</p>
        <button className={`btn-primary ${styles.addToCart}`}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}
