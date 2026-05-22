"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Search, Menu, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { totalItems, toggleCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const handleUserClick = () => {
    if (isAuthenticated) {
      router.push('/account');
    } else {
      router.push('/login');
    }
    setIsMobileMenuOpen(false);
  };

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
          </div>
          
          <Link href="/about" className={styles.link}>About Us</Link>
        </nav>
        
        <div className={styles.actions}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <input 
              type="text" 
              placeholder="Search..." 
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>
              <Search size={18} />
            </button>
          </form>

          <button className={styles.iconBtn} onClick={handleUserClick}>
            <User size={22} />
          </button>
          <button className={styles.cartBtn} onClick={toggleCart}>
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className={styles.cartBadge}>{totalItems}</span>
            )}
          </button>
          
          <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`${styles.mobileMenuOverlay} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuHeader}>
          <img src="/assets/top-rated-logo.png" alt="Logo" className={styles.mobileLogo} />
          <button className={styles.closeMenuBtn} onClick={() => setIsMobileMenuOpen(false)}>
            <X size={28} />
          </button>
        </div>
        
        <form className={styles.mobileSearchForm} onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Search for cards..." 
            className={styles.mobileSearchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className={styles.mobileSearchBtn}>
            <Search size={20} />
          </button>
        </form>

        <nav className={styles.mobileNavLinks}>
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)}>Shop All</Link>
          <Link href="/shop?category=sealed" onClick={() => setIsMobileMenuOpen(false)}>Sealed Products</Link>
          <Link href="/shop?category=singles" onClick={() => setIsMobileMenuOpen(false)}>Singles</Link>
          <Link href="/about" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
          
          <hr className={styles.mobileDivider} />
          
          <button className={styles.mobileActionBtn} onClick={handleUserClick}>
            <User size={20} />
            {isAuthenticated ? 'My Account' : 'Sign In'}
          </button>
        </nav>
      </div>
    </header>
  );
}
