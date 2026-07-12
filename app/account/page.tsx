"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useWantList } from '@/contexts/WantListContext';
import ProductCard from '@/components/ProductCard';
import { getMyOrders } from '@/lib/orderActions';
import type { MyOrder } from '@/lib/types';
import styles from './page.module.css';

type Tab = 'orders' | 'wantlist' | 'settings';

export default function Account() {
  const { user, isAuthenticated, isAuthReady, signOut } = useAuth();
  const { wantList } = useWantList();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Only redirect once we've actually read the persisted auth state —
  // otherwise the first render kicks logged-in users to /login.
  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthReady, isAuthenticated, router]);

  // Load the signed-in customer's real orders (state is set async in .then,
  // so this doesn't trip the set-state-in-effect rule).
  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;
    let cancelled = false;
    getMyOrders()
      .then((o) => { if (!cancelled) { setOrders(o); setOrdersLoading(false); } })
      .catch(() => { if (!cancelled) setOrdersLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthReady, isAuthenticated]);

  if (!isAuthReady) {
    return (
      <div
        className="container"
        style={{ padding: '4rem 0', textAlign: 'center' }}
      >
        Loading account…
      </div>
    );
  }

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
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`${styles.navLink} ${activeTab === 'orders' ? styles.active : ''}`}
          >
            Order History
          </button>
          <button 
            onClick={() => setActiveTab('wantlist')} 
            className={`${styles.navLink} ${activeTab === 'wantlist' ? styles.active : ''}`}
          >
            Want List ({wantList.length})
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`${styles.navLink} ${activeTab === 'settings' ? styles.active : ''}`}
          >
            Settings
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
            className={`${styles.navLink} ${styles.logout}`}
          >
            Sign Out
          </button>
        </nav>
      </div>

      <div className={styles.content}>
        {activeTab === 'orders' && (
          <>
            <h1 className={styles.pageTitle}>Order History</h1>

            {ordersLoading ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>You haven&apos;t placed any orders yet.</p>
                <Link href="/shop" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                  Browse Shop
                </Link>
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.orderNumber} className={`glass-panel ${styles.orderCard}`}>
                  <div className={styles.orderHeader}>
                    <div>
                      <span className={styles.orderId}>Order #{o.orderNumber}</span>
                      <span className={styles.date}>
                        Placed on{' '}
                        {new Date(o.placedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className={styles.status}>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </span>
                  </div>

                  <div className={styles.orderItems}>
                    {o.items.map((it, i) => (
                      <div key={i} className={styles.item}>
                        <div className={styles.itemDetails}>
                          <h4>{it.name}</h4>
                          <p>Qty: {it.quantity}</p>
                        </div>
                        <div className={styles.itemPrice}>${(it.unitPrice * it.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.orderFooter}>
                    <div className={styles.total}>Total: ${o.total.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'wantlist' && (
          <>
            <h1 className={styles.pageTitle}>My Want List</h1>
            {wantList.length === 0 ? (
              <div className={`glass-panel`} style={{ padding: '4rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>You haven&apos;t saved any items yet.</p>
                <Link href="/shop" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                  Browse Shop
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '2rem' }}>
                {wantList.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <h1 className={styles.pageTitle}>Account Settings</h1>
            <div className={`glass-panel`} style={{ padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Settings functionality will be implemented in Phase 4 (Supabase Integration).</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
