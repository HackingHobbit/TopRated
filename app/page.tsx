import Link from 'next/link';
import styles from './page.module.css';
import ProductCard from '@/components/ProductCard';

const FEATURED_PRODUCTS = [
  { id: '1', name: 'Premium Hobby Box', price: 199.99, image: '/assets/4244.JPG', category: 'sealed' as const },
  { id: '2', name: 'Vintage Graded PSA 10', price: 499.50, image: '/assets/4242.JPG', category: 'singles' as const },
  { id: '3', name: 'Rookie Autograph /99', price: 150.00, image: '/assets/4231.JPG', category: 'singles' as const },
  { id: '4', name: 'Retail Blaster Box', price: 29.99, image: '/assets/4210.JPG', category: 'sealed' as const },
];

export default function Home() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroLogoWrapper}>
          <img 
            src="/assets/top-rated-logo.png" 
            alt="Top Rated Cards & Collectibles" 
            className={styles.heroLogo} 
          />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            The Ultimate <span className="text-gradient">Collection</span> Awaits.
          </h1>
          <p className={styles.subtitle}>
            Discover premium sealed products and rare singles. Your next big pull starts here.
          </p>
          <div className={styles.heroActions}>
            <Link href="/shop?category=sealed" className="btn-primary">
              Shop Sealed
            </Link>
            <Link href="/shop?category=singles" className="btn-secondary">
              Browse Singles
            </Link>
          </div>
        </div>
      </section>

      <section className={`container ${styles.featured}`}>
        <div className={styles.sectionHeader}>
          <h2>Featured Items</h2>
          <Link href="/shop" className={styles.viewAll}>View All</Link>
        </div>
        <div className={styles.grid}>
          {FEATURED_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className={`container ${styles.visitUs}`}>
        <div className={`glass-panel ${styles.visitCard}`}>
          <div className={styles.visitContent}>
            <h2>Visit Our Store</h2>
            <p>Come browse our collection in person, trade with the community, and grab your favorite packs.</p>
            <div className={styles.addressInfo}>
              <strong>Top Rated Cards & Collectibles</strong><br/>
              123 Collector&apos;s Avenue<br/>
              Hobby City, CA 90210
            </div>
            <a href="https://maps.google.com" target="_blank" rel="noreferrer" className={`btn-primary ${styles.directionsBtn}`}>
              Get Directions
            </a>
          </div>
          <div className={styles.mapPlaceholder}>
            <div className={styles.mapFallback}>
              Interactive Map Integration
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
