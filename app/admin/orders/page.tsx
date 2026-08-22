import { getAdminOrders } from '@/lib/db';
import OrdersTable from './OrdersTable';
import styles from '../page.module.css';

export default async function AdminOrders() {
  const orders = await getAdminOrders();

  return (
    <>
      <div className={styles.header}>
        <h1>Order Management</h1>
      </div>

      <OrdersTable initialOrders={orders} />
    </>
  );
}
