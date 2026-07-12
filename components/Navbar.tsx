"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, User, Search, Menu, X, LayoutDashboard } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { totalItems, toggleCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  // Admin-only entry point to the dashboard. This is a UX convenience —
  // the real protection is the server-side gate in app/admin/layout.tsx.
  // user is null until auth hydrates, so the link simply isn't rendered
  // for anonymous/visitor sessions.
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when the path changes. usePathname is a string that
  // updates on every navigation, so React picks up the change and re-runs
  // the effect — useRouter() returned a stable reference that never
  // triggered the effect at all.
  //
  // We intentionally don't depend on useSearchParams() — adding that here
  // would force every page (including the prerendered not-found) into a
  // Suspense boundary for the Navbar, which is more cost than it's worth.
  // Filter/sort UIs that only change the query string already close the
  // menu via their own handlers.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      // Bring the user back to where they were after signing in. Read the
      // full path+query from location at click time so we don't have to pull
      // useSearchParams into the Navbar. Never bounce back to an auth page.
      const here =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/';
      const onAuthPage =
        here.startsWith('/login') || here.startsWith('/signup');
      router.push(
        onAuthPage ? '/login' : `/login?redirect=${encodeURIComponent(here)}`
      );
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/assets/top-rated-logo.png"
            alt="Top Rated Logo"
            className={styles.logo}
            width={140}
            height={44}
            priority
            sizes="140px"
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
                  <Link href="/shop?subCategory=MLB">MLB</Link>
                  <Link href="/shop?subCategory=NBA">NBA</Link>
                  <Link href="/shop?subCategory=NHL">NHL</Link>
                  <Link href="/shop?subCategory=Soccer">Soccer</Link>
                  <Link href="/shop?subCategory=Combat">Combat (UFC / Boxing / WWE)</Link>
                  <Link href="/shop?subCategory=Racing">Racing (NASCAR / F1)</Link>
                  <Link href="/shop?subCategory=Golf">Golf</Link>
                </div>
                <div className={styles.dropdownColumn}>
                  <h4>Trading Card Games</h4>
                  <Link href="/shop?subCategory=TCG">All TCG</Link>
                  <Link href="/shop?subCategory=TCG&amp;search=Pokemon">Pokémon</Link>
                  <Link href="/shop?subCategory=TCG&amp;search=Magic">Magic: The Gathering</Link>
                  <Link href="/shop?subCategory=TCG&amp;search=One+Piece">One Piece</Link>
                  <Link href="/shop?subCategory=TCG&amp;search=Marvel">Marvel</Link>
                  <Link href="/shop?subCategory=TCG&amp;search=Disney">Disney Lorcana</Link>
                  <Link href="/shop?subCategory=TCG&amp;search=My+Little+Pony">My Little Pony</Link>
                </div>
                <div className={styles.dropdownColumn}>
                  <h4>Browse</h4>
                  <Link href="/shop">All Products</Link>
                  <Link href="/shop?type=sealed">Sealed Boxes</Link>
                  <Link href="/shop?type=single">Singles</Link>
                  <Link href="/shop?sale=1">Deals</Link>
                  <Link href="/shop?subCategory=Accessories">Accessories &amp; Supplies</Link>
                  <Link href="/shop?subCategory=Signed Jersey">Signed Memorabilia</Link>
                  <Link href="/shop?subCategory=Entertainment">Entertainment</Link>
                  <Link href="/shop?subCategory=Beverages">Beverages</Link>
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

          {isAdmin && (
            <Link href="/admin" className={styles.adminBtn} aria-label="Admin dashboard">
              <LayoutDashboard size={18} />
              <span>Admin</span>
            </Link>
          )}

          <button className={styles.iconBtn} onClick={handleUserClick} aria-label={isAuthenticated ? 'My account' : 'Sign in'}>
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
          <Image
            src="/assets/top-rated-logo.png"
            alt="Logo"
            className={styles.mobileLogo}
            width={140}
            height={44}
            sizes="140px"
          />
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
          <Link href="/shop?type=sealed" onClick={() => setIsMobileMenuOpen(false)}>Sealed Boxes</Link>
          <Link href="/shop?type=single" onClick={() => setIsMobileMenuOpen(false)}>Singles</Link>
          <Link href="/shop?sale=1" onClick={() => setIsMobileMenuOpen(false)}>Deals</Link>
          <Link href="/about" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
          
          <hr className={styles.mobileDivider} />
          
          <button className={styles.mobileActionBtn} onClick={handleUserClick}>
            <User size={20} />
            {isAuthenticated ? 'My Account' : 'Sign In'}
          </button>

          {isAdmin && (
            <Link
              href="/admin"
              className={styles.mobileAdminLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboard size={20} />
              Admin Dashboard
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
