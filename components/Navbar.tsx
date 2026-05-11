import Link from 'next/link';
import { ShoppingCart, User } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.brand}>
          <img src="/assets/top-rated-logo.png" alt="Top Rated" className={styles.logo} />
        </Link>
        
        <nav className={styles.navLinks}>
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/shop" className={styles.link}>Shop</Link>
          <Link href="/about" className={styles.link}>About Us</Link>
        </nav>
        
        <div className={styles.actions}>
          <Link href="/account" className={styles.iconBtn} aria-label="Account">
            <User size={20} />
          </Link>
          <button className={styles.cartBtn} aria-label="Cart">
            <ShoppingCart size={20} />
            <span className={styles.cartBadge}>0</span>
          </button>
        </div>
      </div>
    </header>
  );
}
