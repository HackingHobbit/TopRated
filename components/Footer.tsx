import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerGrid}`}>
        
        <div className={styles.footerSection}>
          <div className={styles.brand}>
            <Image
              src="/assets/top-rated-logo.png"
              alt="Top Rated Logo"
              className={styles.logo}
              width={200}
              height={60}
              sizes="200px"
            />
          </div>
          <p className={styles.description}>
            Your premium destination for authenticated trading cards, sealed products, and hobby supplies.
          </p>
          <div className={styles.socials}>
            <a href="#" className={styles.socialIcon}>FB</a>
            <a href="#" className={styles.socialIcon}>TW</a>
            <a href="#" className={styles.socialIcon}>IG</a>
          </div>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.heading}>Shop</h4>
          <nav className={styles.links}>
            <Link href="/shop?type=sealed">Sealed Products</Link>
            <Link href="/shop?type=single">Premium Singles</Link>
            <Link href="/shop?subCategory=NFL">Sports Cards</Link>
            <Link href="/shop?subCategory=Pokémon">TCG Cards</Link>
            <Link href="/shop?subCategory=Store Merch">Merchandise</Link>
          </nav>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.heading}>Customer Service</h4>
          <nav className={styles.links}>
            <Link href="/account">My Account</Link>
            <Link href="#">Shipping Policy</Link>
            <Link href="#">Returns & Refunds</Link>
            <Link href="#">Authenticity Guarantee</Link>
            <Link href="#">FAQ</Link>
          </nav>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.heading}>Contact Us</h4>
          <div className={styles.contactInfo}>
            <p><MapPin size={16} className={styles.icon} /> 123 Collector&apos;s Avenue<br/>Hobby City, CA 90210</p>
            <p><Phone size={16} className={styles.icon} /> (555) 123-4567</p>
            <p><Mail size={16} className={styles.icon} /> support@topratedcards.com</p>
          </div>
        </div>
        
      </div>
      
      <div className={styles.footerBottom}>
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Top Rated Cards & Collectibles. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
