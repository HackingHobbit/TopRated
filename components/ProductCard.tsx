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
        <span className={styles.badge}>
          {product.isSealed ? 'Sealed' : 'Single'}
        </span>
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
