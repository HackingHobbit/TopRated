import Link from 'next/link';
import styles from '../page.module.css'; // Reuse admin dashboard styles
import { Search } from 'lucide-react';

export default function AdminOrders() {
  return (
    <div className={`container ${styles.adminContainer}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Admin Portal</h3>
        </div>
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>Dashboard</Link>
          <Link href="/admin/inventory" className={styles.navLink}>Inventory</Link>
          <Link href="/admin/orders" className={`${styles.navLink} ${styles.active}`}>Orders</Link>
          <Link href="/admin/customers" className={styles.navLink}>Customers</Link>
        </nav>
      </aside>
      
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Order Management</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search orders..." 
                style={{
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elevated)',
                  color: 'white'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
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
                <td><span className={`${styles.statusBadge} ${styles.pending}`}>Unfulfilled</span></td>
                <td>$450.00</td>
                <td><button style={{ background: 'none', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Fulfill</button></td>
              </tr>
              <tr>
                <td>TR-10494</td>
                <td>May 20, 2026</td>
                <td>Sarah J.</td>
                <td><span className={`${styles.statusBadge} ${styles.shipped}`}>Shipped</span></td>
                <td>$125.50</td>
                <td><button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>View</button></td>
              </tr>
              <tr>
                <td>TR-10493</td>
                <td>May 20, 2026</td>
                <td>Guest</td>
                <td><span className={`${styles.statusBadge} ${styles.shipped}`}>Shipped</span></td>
                <td>$89.99</td>
                <td><button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>View</button></td>
              </tr>
              <tr>
                <td>TR-10492</td>
                <td>May 10, 2026</td>
                <td>John Doe</td>
                <td><span className={`${styles.statusBadge} ${styles.processing}`}>Processing</span></td>
                <td>$215.49</td>
                <td><button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
