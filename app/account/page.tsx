import Link from 'next/link';
import styles from './page.module.css';

export default function Account() {
  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>JD</div>
          <div>
            <h2 className={styles.name}>John Doe</h2>
            <p className={styles.email}>john.doe@example.com</p>
          </div>
        </div>
        <nav className={styles.nav}>
          <a href="#" className={`${styles.navLink} ${styles.active}`}>Order History</a>
          <a href="#" className={styles.navLink}>Want List</a>
          <a href="#" className={styles.navLink}>Settings</a>
          <Link href="/login" className={`${styles.navLink} ${styles.logout}`}>Sign Out</Link>
        </nav>
      </div>

      <div className={styles.content}>
        <h1 className={styles.pageTitle}>Order History</h1>
        
        <div className={`glass-panel ${styles.orderCard}`}>
          <div className={styles.orderHeader}>
            <div>
              <span className={styles.orderId}>Order #TR-10492</span>
              <span className={styles.date}>Placed on May 10, 2026</span>
            </div>
            <span className={styles.status}>Processing</span>
          </div>
          
          <div className={styles.orderItems}>
            <div className={styles.item}>
              <img src="/assets/4222.JPG" alt="Premium Hobby Box" className={styles.itemImage} />
              <div className={styles.itemDetails}>
                <h4>Premium Hobby Box</h4>
                <p>Qty: 1</p>
              </div>
              <div className={styles.itemPrice}>$199.99</div>
            </div>
          </div>
          
          <div className={styles.orderFooter}>
            <div className={styles.total}>Total: $215.49</div>
            {/* Clover Mock Notification */}
            <div className={styles.cloverMock}>
              <p><strong>Payment Method:</strong> Clover Terminal (Mock)</p>
              <p className={styles.cloverNote}>Note: In production, this section will pull receipt data via the Clover API.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
