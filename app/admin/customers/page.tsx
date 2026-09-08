import Link from 'next/link';
import { getCustomers } from '@/lib/db';
import styles from '../page.module.css';

export default async function AdminCustomers() {
  const customers = await getCustomers();

  return (
    <>
      <div className={styles.header}>
        <h1>Customer Directory</h1>
        <Link href="/admin/users" className="btn-primary">
          Manage Users
        </Link>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Role</th>
              <th>Total Orders</th>
              <th>Lifetime Spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((cust) => (
              <tr key={cust.id}>
                <td>
                  <div className={styles.customerName}>{cust.name || '—'}</div>
                  <div className={styles.customerEmail}>{cust.email}</div>
                </td>
                <td style={{ textTransform: 'capitalize' }}>{cust.role}</td>
                <td>{cust.orders}</td>
                <td>${cust.spent.toFixed(2)}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
