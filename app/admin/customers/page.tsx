import styles from '../page.module.css';
import Link from 'next/link';

export default function AdminCustomers() {
  const mockCustomers = [
    { id: 'CUST-001', name: 'John Doe', email: 'john@example.com', orders: 12, spent: 4520.50, tier: 'Gold' },
    { id: 'CUST-002', name: 'Jane Smith', email: 'jane.smith@example.com', orders: 3, spent: 450.00, tier: 'Silver' },
    { id: 'CUST-003', name: 'Alex Johnson', email: 'alexj@test.com', orders: 28, spent: 12050.00, tier: 'Diamond' },
    { id: 'CUST-004', name: 'Sam Wilson', email: 'swilson@mail.com', orders: 1, spent: 45.99, tier: 'Bronze' },
  ];

  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customer Directory</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin" className="btn-secondary">Back to Dashboard</Link>
          <button className="btn-primary">Export CSV</button>
        </div>
      </div>

      <div className={`glass-panel ${styles.dashboardCard}`}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name / Email</th>
                <th>Total Orders</th>
                <th>Lifetime Spent</th>
                <th>Loyalty Tier</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockCustomers.map((cust) => (
                <tr key={cust.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{cust.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{cust.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cust.email}</div>
                  </td>
                  <td>{cust.orders}</td>
                  <td>${cust.spent.toFixed(2)}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[cust.tier.toLowerCase() + 'Tier'] || ''}`}>
                      {cust.tier}
                    </span>
                  </td>
                  <td>
                    <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>View Profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
