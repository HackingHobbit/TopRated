import styles from '../page.module.css';
import { Search } from 'lucide-react';

export default function AdminOrders() {
  return (
    <>
      <div className={styles.header}>
        <h1>Order Management</h1>
        <div className={styles.headerActions}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search orders..."
              className={styles.searchInput}
            />
          </div>
          <button className="btn-primary">Export CSV</button>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Fulfillment</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TR-10495</td>
              <td>May 21, 2026</td>
              <td>Mike W.</td>
              <td>
                <span className={`${styles.statusBadge} ${styles.pending}`}>
                  Unfulfilled
                </span>
              </td>
              <td>$450.00</td>
              <td>
                <button className={styles.fulfillBtn}>Fulfill</button>
              </td>
            </tr>
            <tr>
              <td>TR-10494</td>
              <td>May 20, 2026</td>
              <td>Sarah J.</td>
              <td>
                <span className={`${styles.statusBadge} ${styles.shipped}`}>
                  Shipped
                </span>
              </td>
              <td>$125.50</td>
              <td>
                <button className={styles.viewBtn}>View</button>
              </td>
            </tr>
            <tr>
              <td>TR-10493</td>
              <td>May 20, 2026</td>
              <td>Guest</td>
              <td>
                <span className={`${styles.statusBadge} ${styles.shipped}`}>
                  Shipped
                </span>
              </td>
              <td>$89.99</td>
              <td>
                <button className={styles.viewBtn}>View</button>
              </td>
            </tr>
            <tr>
              <td>TR-10492</td>
              <td>May 10, 2026</td>
              <td>John Doe</td>
              <td>
                <span className={`${styles.statusBadge} ${styles.processing}`}>
                  Processing
                </span>
              </td>
              <td>$215.49</td>
              <td>
                <button className={styles.viewBtn}>View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
