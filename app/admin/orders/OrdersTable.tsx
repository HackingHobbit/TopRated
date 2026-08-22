'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { updateOrderStatus } from '@/lib/orderActions';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orderStatus';
import type { AdminOrderRow } from '@/lib/db';
import styles from '../page.module.css';

const STATUS_BADGE: Record<string, string> = {
  pending: styles.pending,
  processing: styles.processing,
  shipped: styles.shipped,
  delivered: styles.delivered,
  canceled: styles.canceled,
  refunded: styles.refunded,
};

const RESTOCKING_STATUSES = new Set<OrderStatus>(['canceled', 'refunded']);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function OrdersTable({ initialOrders }: { initialOrders: AdminOrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleStatusChange = async (order: AdminOrderRow, next: OrderStatus) => {
    if (next === order.status) return;
    const previous = order.status;
    setUpdatingId(order.id);
    // Optimistic update — reverted below if the server rejects it.
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));

    const res = await updateOrderStatus(order.id, next);
    setUpdatingId(null);

    if (!res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: previous } : o)));
      addToast({ title: 'Failed', message: res.error || 'Could not update order status.', type: 'error' });
      return;
    }
    addToast({
      title: 'Order Updated',
      message: RESTOCKING_STATUSES.has(next)
        ? `${order.orderNumber} marked ${next} — items restocked.`
        : `${order.orderNumber} marked ${next}.`,
      type: 'success',
    });
  };

  return (
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
                <select
                  className={`${styles.statusBadge} ${styles.statusSelect} ${STATUS_BADGE[o.status] ?? ''}`}
                  value={o.status}
                  disabled={updatingId === o.id}
                  onChange={(e) => handleStatusChange(o, e.target.value as OrderStatus)}
                  aria-label={`Status for order ${o.orderNumber}`}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
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
  );
}
