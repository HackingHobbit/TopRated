"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { totalItems, toggleCart } = useCart();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.brand}>
          <img 
            src="/assets/top-rated-logo.png" 
            alt="Top Rated Logo" 
            className={styles.logo}
          />
        </Link>
        
        <nav className={styles.navLinks}>
          <Link href="/" className={styles.link}>Home</Link>
          
          <div className={styles.dropdownContainer}>
            <Link href="/shop" className={styles.link}>Shop</Link>
            
            <div className={styles.dropdownMenu}>
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
                <Link href="/shop?subCategory=One Piece">One Piece</Link>
              </div>
              <div className={styles.dropdownColumn}>
                <h4>Other</h4>
                <Link href="/shop?subCategory=Memorabilia">Memorabilia</Link>
                <Link href="/shop?subCategory=Store Merch">Merchandise</Link>
                <Link href="/shop?subCategory=Accessories">Accessories</Link>
              </div>
            </div>
          </div>
          
          <Link href="/about" className={styles.link}>About Us</Link>
        </nav>
        
        <div className={styles.actions}>
          <button className={styles.iconBtn}>
            <User size={22} />
          </button>
          <button className={styles.cartBtn} onClick={toggleCart}>
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className={styles.cartBadge}>{totalItems}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
