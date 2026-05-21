import { Suspense } from 'react';
import { getProducts } from '@/lib/db';
import ShopClient from './ShopClient';
import styles from './page.module.css';

export default async function ShopPage() {
  const allProducts = await getProducts();

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.header}>
        <h1 className="text-gradient">Our Inventory</h1>
        <p className={styles.subtitle}>Browse our extensive collection of sealed products, singles, and more.</p>
      </div>

      <Suspense fallback={<div className={styles.loading}>Loading inventory...</div>}>
        <ShopClient initialProducts={allProducts} />
      </Suspense>
    </div>
  );
}
