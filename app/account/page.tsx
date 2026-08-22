"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useWantList } from '@/contexts/WantListContext';
import ProductCard from '@/components/ProductCard';
import { getMyOrders } from '@/lib/orderActions';
import type { MyOrder } from '@/lib/types';
import {
  getMyProfile,
  updateMyProfile,
  listMyAddresses,
  saveAddress,
  deleteAddress,
  type SavedAddress,
} from '@/lib/addressActions';
import { listMyPaymentMethods, deletePaymentMethod, type SavedCard } from '@/lib/paymentMethodActions';
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
            <SettingsPanel />
          </>
        )}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const [cards, setCards] = useState<SavedCard[]>([]);

  const refreshAddresses = () => listMyAddresses().then(setAddresses);
  const refreshCards = () => listMyPaymentMethods().then(setCards);

  useEffect(() => {
    getMyProfile().then((p) => { if (p) setProfile(p); });
    refreshAddresses();
    refreshCards();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    const res = await updateMyProfile(profile);
    setProfileSaving(false);
    if (res.ok) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const handleAddAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setAddressSaving(true);
    const res = await saveAddress({
      label: String(data.get('label') ?? ''),
      fullName: String(data.get('fullName') ?? ''),
      phone: String(data.get('phone') ?? ''),
      address: String(data.get('address') ?? ''),
      city: String(data.get('city') ?? ''),
      state: String(data.get('state') ?? ''),
      zip: String(data.get('zip') ?? ''),
      isDefault: data.get('isDefault') === 'on',
    });
    setAddressSaving(false);
    if (res.ok) {
      setShowAddressForm(false);
      e.currentTarget.reset();
      refreshAddresses();
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteAddress(id);
    refreshAddresses();
  };

  const handleDeleteCard = async (id: string) => {
    await deletePaymentMethod(id);
    refreshCards();
  };

  return (
    <>
      <div className={`glass-panel ${styles.settingsSection}`} style={{ padding: '2rem' }}>
        <h3>Profile</h3>
        <form onSubmit={handleSaveProfile}>
          <div className={styles.settingsRow}>
            <div className={styles.settingsField}>
              <label htmlFor="settingsName">Name</label>
              <input
                id="settingsName"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className={styles.settingsField}>
              <label htmlFor="settingsPhone">Phone</label>
              <input
                id="settingsPhone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save'}
          </button>
          {profileSaved && (
            <span style={{ marginLeft: '1rem', color: 'var(--accent-red)', fontSize: '0.9rem' }}>
              Saved.
            </span>
          )}
        </form>
      </div>

      <div className={`glass-panel ${styles.settingsSection}`} style={{ padding: '2rem' }}>
        <h3>Saved Addresses</h3>
        {addresses.length === 0 && (
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No saved addresses yet.</p>
        )}
        {addresses.map((a) => (
          <div key={a.id} className={styles.savedItemCard}>
            <div>
              <strong>{a.label || 'Address'}</strong>
              {a.isDefault && <span className={styles.defaultBadge}>Default</span>}
              <div className={styles.savedItemMeta}>
                {a.fullName} &middot; {a.address}, {a.city}, {a.state} {a.zip}
              </div>
            </div>
            <button className={styles.deleteBtn} onClick={() => handleDeleteAddress(a.id)}>
              Remove
            </button>
          </div>
        ))}

        {showAddressForm ? (
          <form onSubmit={handleAddAddress} style={{ marginTop: '1rem' }}>
            <div className={styles.settingsRow}>
              <div className={styles.settingsField}>
                <label htmlFor="label">Label</label>
                <input id="label" name="label" placeholder="Home" />
              </div>
              <div className={styles.settingsField}>
                <label htmlFor="addrFullName">Full Name</label>
                <input id="addrFullName" name="fullName" required />
              </div>
              <div className={styles.settingsField}>
                <label htmlFor="addrPhone">Phone</label>
                <input id="addrPhone" name="phone" type="tel" />
              </div>
            </div>
            <div className={styles.settingsRow}>
              <div className={styles.settingsField} style={{ flexBasis: '100%' }}>
                <label htmlFor="addrAddress">Address</label>
                <input id="addrAddress" name="address" required />
              </div>
            </div>
            <div className={styles.settingsRow}>
              <div className={styles.settingsField}>
                <label htmlFor="addrCity">City</label>
                <input id="addrCity" name="city" required />
              </div>
              <div className={styles.settingsField}>
                <label htmlFor="addrState">State</label>
                <input id="addrState" name="state" required />
              </div>
              <div className={styles.settingsField}>
                <label htmlFor="addrZip">ZIP</label>
                <input id="addrZip" name="zip" required />
              </div>
            </div>
            <label className={styles.savedItemMeta} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="checkbox" name="isDefault" style={{ width: 'auto' }} />
              Make this my default address
            </label>
            <div>
              <button type="submit" className="btn-primary" disabled={addressSaving} style={{ marginRight: '0.75rem' }}>
                {addressSaving ? 'Saving…' : 'Save Address'}
              </button>
              <button type="button" className={styles.deleteBtn} onClick={() => setShowAddressForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button className="btn-primary" onClick={() => setShowAddressForm(true)} style={{ marginTop: '0.5rem' }}>
            + Add Address
          </button>
        )}
      </div>

      <div className={`glass-panel ${styles.settingsSection}`} style={{ padding: '2rem' }}>
        <h3>Saved Payment Methods</h3>
        {cards.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            No saved cards yet. Check &ldquo;Save this card for next time&rdquo; at checkout to add one.
          </p>
        ) : (
          cards.map((c) => (
            <div key={c.id} className={styles.savedItemCard}>
              <div>
                <strong>{c.brand} •••• {c.last4}</strong>
                {c.isDefault && <span className={styles.defaultBadge}>Default</span>}
                {c.expMonth && c.expYear && (
                  <div className={styles.savedItemMeta}>Expires {c.expMonth}/{c.expYear}</div>
                )}
              </div>
              <button className={styles.deleteBtn} onClick={() => handleDeleteCard(c.id)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
