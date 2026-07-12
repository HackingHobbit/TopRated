import styles from './page.module.css';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';
import { getDashboardStats } from '@/lib/db';
import DemoOrdersButton from './DemoOrdersButton';

const STATUS_CLASS: Record<string, string> = {
  pending: 'pending',
  processing: 'processing',
  shipped: 'shipped',
};

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default async function AdminDashboard() {
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const stats = await getDashboardStats();

  return (
    <>
      <div className={styles.header}>
        <h1>Daily Dashboard</h1>
        <p className={styles.date}>{todayLabel}</p>
      </div>

      {stats.cloverMock && <DemoOrdersButton count={stats.demoOrderCount} />}

      <div className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Sales Today</h4>
            <DollarSign className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>{money(stats.salesToday)}</p>
          <p className={styles.metricTrend}>
            {stats.ordersToday} order{stats.ordersToday === 1 ? '' : 's'} today
          </p>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Orders Today</h4>
            <ShoppingCart className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>{stats.ordersToday}</p>
          <p className={styles.metricTrend}>placed since midnight</p>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Out of Stock</h4>
            <Package className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>{stats.outOfStock}</p>
          <p className={styles.metricTrend}>
            {stats.outOfStock > 0 ? (
              <span className={styles.negative}>Needs restock</span>
            ) : (
              <span className={styles.positive}>All in stock</span>
            )}
          </p>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Customers</h4>
            <Users className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>{stats.customers.toLocaleString('en-US')}</p>
          <p className={styles.metricTrend}>registered accounts</p>
        </div>
      </div>

      <div className={styles.recentOrders}>
        <h2>Recent Activity</h2>
        <div className={`glass-panel ${styles.tableContainer}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>No orders yet.</td>
                </tr>
              ) : (
                stats.recentOrders.map((o) => (
                  <tr key={o.orderNumber}>
                    <td>{o.orderNumber}</td>
                    <td>{o.customer}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[STATUS_CLASS[o.status] ?? 'pending']}`}
                      >
                        {titleCase(o.status)}
                      </span>
                    </td>
                    <td>${o.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
