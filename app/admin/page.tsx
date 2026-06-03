import styles from './page.module.css';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  // Display the current date instead of a hardcoded literal so the
  // dashboard doesn't look frozen in time.
  const todayLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div className={styles.header}>
        <h1>Dashboard Overview</h1>
        <p className={styles.date}>{todayLabel}</p>
      </div>

      <div className={styles.metricsGrid}>
        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Total Sales</h4>
            <DollarSign className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>$4,295.50</p>
          <p className={styles.metricTrend}>
            <span className={styles.positive}>+12%</span> from yesterday
          </p>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>New Orders</h4>
            <ShoppingCart className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>24</p>
          <p className={styles.metricTrend}>
            <span className={styles.positive}>+5%</span> from yesterday
          </p>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Low Stock Items</h4>
            <Package className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>12</p>
          <p className={styles.metricTrend}>
            <span className={styles.negative}>Action Needed</span>
          </p>
        </div>

        <div className={`glass-panel ${styles.metricCard}`}>
          <div className={styles.metricHeader}>
            <h4>Active Customers</h4>
            <Users className={styles.metricIcon} size={20} />
          </div>
          <p className={styles.metricValue}>1,204</p>
          <p className={styles.metricTrend}>
            <span className={styles.positive}>+8</span> this week
          </p>
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
              <tr>
                <td>TR-10495</td>
                <td>Mike W.</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles.pending}`}>
                    Pending
                  </span>
                </td>
                <td>$450.00</td>
              </tr>
              <tr>
                <td>TR-10494</td>
                <td>Sarah J.</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles.shipped}`}>
                    Shipped
                  </span>
                </td>
                <td>$125.50</td>
              </tr>
              <tr>
                <td>TR-10493</td>
                <td>Guest</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles.processing}`}>
                    Processing
                  </span>
                </td>
                <td>$89.99</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
