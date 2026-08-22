import { getAdminOrders } from '@/lib/db';
import styles from '../page.module.css';

const STATUS_BADGE: Record<string, string> = {
  pending: styles.pending,
  processing: styles.processing,
  shipped: styles.shipped,
  delivered: styles.delivered,
  canceled: styles.canceled,
  refunded: styles.refunded,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function AdminOrders() {
  const orders = await getAdminOrders();

  return (
    <>
      <div className={styles.header}>
        <h1>Order Management</h1>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{formatDate(o.placedAt)}</td>
                <td>{o.customer}</td>
                <td>
                  <span className={`${styles.statusBadge} ${STATUS_BADGE[o.status] ?? ''}`}>
                    {o.status}
                  </span>
                </td>
                <td>${o.total.toFixed(2)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
