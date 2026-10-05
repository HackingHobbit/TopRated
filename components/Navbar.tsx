"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, CircleUserRound, LogIn, Search, Menu, X, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Navbar.module.css';

// Shop menu shared by the desktop dropdown and the mobile menu, so the two
// can never drift apart.
const SHOP_MENU: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Sports',
    links: [
      { label: 'NFL', href: '/shop?subCategory=NFL' },
      { label: 'MLB', href: '/shop?subCategory=MLB' },
      { label: 'NBA', href: '/shop?subCategory=NBA' },
      { label: 'NHL', href: '/shop?subCategory=NHL' },
      { label: 'Soccer', href: '/shop?subCategory=Soccer' },
      { label: 'Combat (UFC / Boxing / WWE)', href: '/shop?subCategory=Combat' },
      { label: 'Racing (NASCAR / F1)', href: '/shop?subCategory=Racing' },
      { label: 'Golf', href: '/shop?subCategory=Golf' },
    ],
  },
  {
    title: 'Trading Card Games',
    links: [
      { label: 'All TCG', href: '/shop?subCategory=TCG' },
      { label: 'Pokémon', href: '/shop?subCategory=TCG&search=Pokemon' },
      { label: 'Magic: The Gathering', href: '/shop?subCategory=TCG&search=Magic' },
      { label: 'One Piece', href: '/shop?subCategory=TCG&search=One+Piece' },
      { label: 'Marvel', href: '/shop?subCategory=TCG&search=Marvel' },
      { label: 'Disney Lorcana', href: '/shop?subCategory=TCG&search=Disney' },
      { label: 'My Little Pony', href: '/shop?subCategory=TCG&search=My+Little+Pony' },
    ],
  },
  {
    title: 'Browse',
    links: [
      { label: 'All Products', href: '/shop' },
      { label: 'Sealed Boxes', href: '/shop?type=sealed' },
      { label: 'Singles', href: '/shop?type=single' },
      { label: 'Deals', href: '/shop?sale=1' },
      { label: 'Accessories & Supplies', href: '/shop?subCategory=Accessories' },
      { label: 'Signed Memorabilia', href: '/shop?subCategory=Signed Jersey' },
      { label: 'Entertainment', href: '/shop?subCategory=Entertainment' },
      { label: 'Beverages', href: '/shop?subCategory=Beverages' },
    ],
  },
];

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
  // Which shop section is expanded in the mobile menu (one at a time).
  const [openSection, setOpenSection] = useState<string | null>(null);

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
            unoptimized
          />
        </Link>
        
        <nav className={styles.navLinks}>
          <Link href="/" className={styles.link}>Home</Link>
          
          <div className={styles.dropdownContainer}>
            <Link href="/shop" className={styles.link}>Shop</Link>
            
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownGrid}>
                {SHOP_MENU.map((section) => (
                  <div key={section.title} className={styles.dropdownColumn}>
                    <h4>{section.title}</h4>
                    {section.links.map((l) => (
                      <Link key={l.href} href={l.href}>{l.label}</Link>
                    ))}
                  </div>
                ))}
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
            <button type="submit" className={styles.searchBtn} aria-label="Search products">
              <Search size={18} />
            </button>
          </form>

          {isAdmin && (
            <Link href="/admin" className={styles.adminBtn} aria-label="Admin dashboard">
              <LayoutDashboard size={18} />
              <span>Admin</span>
            </Link>
          )}

          <button
            className={`${styles.iconBtn} ${isAuthenticated ? styles.iconBtnLoggedIn : styles.iconBtnGuest}`}
            onClick={handleUserClick}
            aria-label={isAuthenticated ? 'My account' : 'Sign in'}
          >
            {isAuthenticated ? <CircleUserRound size={22} /> : <LogIn size={21} />}
          </button>
          <button className={styles.cartBtn} onClick={toggleCart} aria-label={`Open cart${totalItems > 0 ? ` (${totalItems} items)` : ''}`}>
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className={styles.cartBadge}>{totalItems}</span>
            )}
          </button>
          
          <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
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
            unoptimized
          />
          <button className={styles.closeMenuBtn} onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
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
          <button type="submit" className={styles.mobileSearchBtn} aria-label="Search products">
            <Search size={20} />
          </button>
        </form>

        <nav className={styles.mobileNavLinks}>
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)}>Shop All</Link>

          <div className={styles.mobileShopSections}>
            {SHOP_MENU.map((section) => {
              const isOpen = openSection === section.title;
              const panelId = `mobile-shop-${section.title.toLowerCase().replace(/\W+/g, '-')}`;
              return (
                <div key={section.title} className={styles.mobileSection}>
                  <button
                    type="button"
                    className={styles.mobileSectionToggle}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenSection(isOpen ? null : section.title)}
                  >
                    {section.title}
                    <ChevronDown size={20} className={isOpen ? styles.chevronOpen : styles.chevron} aria-hidden />
                  </button>
                  {isOpen && (
                    <div id={panelId} className={styles.mobileSectionLinks}>
                      {section.links.map((l) => (
                        <Link key={l.href} href={l.href} onClick={() => setIsMobileMenuOpen(false)}>
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Link href="/about" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
          
          <hr className={styles.mobileDivider} />
          
          <button className={styles.mobileActionBtn} onClick={handleUserClick}>
            {isAuthenticated ? <CircleUserRound size={20} /> : <LogIn size={20} />}
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
