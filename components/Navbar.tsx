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
          
          <div className={styles.dropdownContainer}>
            <Link href="/shop" className={styles.link}>Shop</Link>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownGrid}>
                <div className={styles.dropdownColumn}>
                  <h4>Sports</h4>
                  <Link href="/shop?subCategory=NFL">NFL</Link>
                  <Link href="/shop?subCategory=NBA">NBA</Link>
                  <Link href="/shop?subCategory=MLB">MLB</Link>
                </div>
                <div className={styles.dropdownColumn}>
                  <h4>TCG</h4>
                  <Link href="/shop?subCategory=Pokémon">Pokémon</Link>
                  <Link href="/shop?subCategory=Marvel">Marvel</Link>
                  <Link href="/shop?subCategory=Disney">Disney</Link>
                </div>
                <div className={styles.dropdownColumn}>
                  <h4>Other</h4>
                  <Link href="/shop?category=services">PSA Submission</Link>
                  <Link href="/shop?subCategory=Accessories">Accessories</Link>
                  <Link href="/shop?subCategory=Memorabilia">Memorabilia</Link>
                </div>
              </div>
            </div>
          </div>

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
