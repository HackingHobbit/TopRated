"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user.name.charAt(0)}</div>
          <div>
            <h2 className={styles.name}>{user.name}</h2>
            <p className={styles.email}>{user.email}</p>
          </div>
        </div>
        
        <div className={styles.loyaltyCard}>
          <h3>Loyalty Points</h3>
          <p className={styles.points}>{user.loyaltyPoints}</p>
          <span className={styles.rankBadge}>Gold Tier</span>
        </div>

        <nav className={styles.nav}>
          <a href="#" className={`${styles.navLink} ${styles.active}`}>Order History</a>
          <a href="#" className={styles.navLink}>Want List</a>
          <a href="#" className={styles.navLink}>Settings</a>
          <button onClick={() => { logout(); router.push('/'); }} className={`${styles.navLink} ${styles.logout}`}>Sign Out</button>
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
              <div className={styles.itemDetails}>
                <h4>Premium Hobby Box</h4>
                <p>Qty: 1</p>
              </div>
              <div className={styles.itemPrice}>$199.99</div>
            </div>
          </div>
          
          <div className={styles.orderFooter}>
            <div className={styles.total}>Total: $215.49</div>
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
