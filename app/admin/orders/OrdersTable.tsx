'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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

// Orders in these statuses still need a staff action (pack/ship them);
// everything else is resolved one way or another, so it's hidden by
// default to keep the table focused on what actually needs attention.
const NEEDS_ATTENTION: OrderStatus[] = ['pending', 'processing'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function OrdersTable({ initialOrders }: { initialOrders: AdminOrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<OrderStatus>>(
    () => new Set(NEEDS_ATTENTION)
  );
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { addToast } = useToast();

  const toggleStatus = (s: OrderStatus) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return orders.filter((o) => {
      if (!visibleStatuses.has(o.status as OrderStatus)) return false;
      if (
        q &&
        !(
          o.orderNumber.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q)
        )
      )
        return false;
      const placed = new Date(o.placedAt);
      if (from && placed < from) return false;
      if (to && placed > to) return false;
      return true;
    });
  }, [orders, visibleStatuses, query, dateFrom, dateTo]);

  const hasFilters = query || dateFrom || dateTo || visibleStatuses.size !== NEEDS_ATTENTION.length;

  const clearFilters = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setVisibleStatuses(new Set(NEEDS_ATTENTION));
  };

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
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search order # or customer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className={styles.dateRangeField}>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className={styles.dateRangeField}>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        {hasFilters && (
          <button type="button" className={styles.clear} onClick={clearFilters}>
            Reset filters
          </button>
        )}
        <span className={styles.count}>
          {filtered.length} of {orders.length}
        </span>
      </div>

      <div className={styles.statusChipBar}>
        {ORDER_STATUSES.map((s) => {
          const active = visibleStatuses.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={
                active
                  ? `${styles.statusBadge} ${styles.statusChip} ${STATUS_BADGE[s]}`
                  : `${styles.statusBadge} ${styles.statusChip} ${styles.statusChipInactive}`
              }
            >
              {statusLabel(s)}
            </button>
          );
        })}
      </div>

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
          {filtered.map((o) => (
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
                      {statusLabel(s)}
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
          {orders.length > 0 && filtered.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No orders match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
