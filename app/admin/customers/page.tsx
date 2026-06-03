import styles from '../page.module.css';

const MOCK_CUSTOMERS = [
  {
    id: 'CUST-001',
    name: 'John Doe',
    email: 'john@example.com',
    orders: 12,
    spent: 4520.5,
    tier: 'Gold',
  },
  {
    id: 'CUST-002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    orders: 3,
    spent: 450.0,
    tier: 'Silver',
  },
  {
    id: 'CUST-003',
    name: 'Alex Johnson',
    email: 'alexj@test.com',
    orders: 28,
    spent: 12050.0,
    tier: 'Diamond',
  },
  {
    id: 'CUST-004',
    name: 'Sam Wilson',
    email: 'swilson@mail.com',
    orders: 1,
    spent: 45.99,
    tier: 'Bronze',
  },
];

const TIER_BADGE: Record<string, string> = {
  Bronze: styles.tierBronze,
  Silver: styles.tierSilver,
  Gold: styles.tierGold,
  Diamond: styles.tierDiamond,
};

export default function AdminCustomers() {
  return (
    <>
      <div className={styles.header}>
        <h1>Customer Directory</h1>
        <div className={styles.headerActions}>
          <button className="btn-primary">Export CSV</button>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
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
            {MOCK_CUSTOMERS.map((cust) => (
              <tr key={cust.id}>
                <td className={styles.customerId}>{cust.id}</td>
                <td>
                  <div className={styles.customerName}>{cust.name}</div>
                  <div className={styles.customerEmail}>{cust.email}</div>
                </td>
                <td>{cust.orders}</td>
                <td>${cust.spent.toFixed(2)}</td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${TIER_BADGE[cust.tier] ?? ''}`}
                  >
                    {cust.tier}
                  </span>
                </td>
                <td>
                  <button className={styles.viewBtn}>View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
