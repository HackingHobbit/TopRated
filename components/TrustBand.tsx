import Link from 'next/link';
import { ShieldCheck, Truck, Lock, Store } from 'lucide-react';
import styles from './TrustBand.module.css';

// Persistent trust/assurance strip shown site-wide under the navbar — the
// convention every major card retailer uses. Claims here mirror what the
// product pages already promise (authenticity + free shipping over $300) and
// the physical store on the homepage; nothing new is asserted.
const ITEMS = [
  { icon: ShieldCheck, title: '100% Authentic', sub: 'Sealed & verified' },
  { icon: Truck, title: 'Free Shipping', sub: 'On orders over $300' },
  { icon: Lock, title: 'Secure Checkout', sub: 'Encrypted & protected' },
  { icon: Store, title: 'Visit In-Store', sub: 'Shop with us locally', href: '/#visit' },
] as const;

export default function TrustBand() {
  return (
    <div className={styles.band}>
      <div className={`container ${styles.inner}`}>
        {ITEMS.map(({ icon: Icon, title, sub, ...rest }) => {
          const content = (
            <>
              <Icon size={18} className={styles.icon} aria-hidden />
              <span className={styles.text}>
                <strong>{title}</strong>
                <span className={styles.sub}>{sub}</span>
              </span>
            </>
          );
          const href = 'href' in rest ? (rest as { href: string }).href : undefined;
          return href ? (
            <Link key={title} href={href} className={styles.item}>
              {content}
            </Link>
          ) : (
            <div key={title} className={styles.item}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
