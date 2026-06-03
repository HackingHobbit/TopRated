import { getProducts } from '@/lib/db';
import InventoryTable from '@/components/InventoryTable';
import adminStyles from '../page.module.css';
import styles from './page.module.css';

export default async function AdminInventoryPage() {
  const products = await getProducts();

  return (
    <>
      <div className={adminStyles.header}>
        <div>
          <h1>Inventory</h1>
          <p className={styles.subtitle}>
            Manage Inventory, Prices, and Store Flags
          </p>
        </div>
        <div className={styles.stats}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Total Items</span>
            <span className={styles.statValue}>{products.length}</span>
          </div>
        </div>
      </div>

      <InventoryTable initialProducts={products} />
    </>
  );
}
