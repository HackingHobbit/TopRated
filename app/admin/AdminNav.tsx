'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './page.module.css';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h3>Admin Portal</h3>
      </div>
      <nav className={styles.nav}>
        {LINKS.map((link) => {
          const isActive =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
