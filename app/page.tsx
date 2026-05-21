import Link from 'next/link';
import styles from './page.module.css';
import ProductCard from '@/components/ProductCard';
import ScrollReveal from '@/components/ScrollReveal';

import { getProducts } from '@/lib/db';

export default async function Home() {
  const featuredProducts = await getProducts();
  const topFeatured = featuredProducts.filter(p => p.isFeatured).slice(0, 4);
  const newReleases = featuredProducts.filter(p => p.isNewRelease).slice(0, 4);
  const preOrders = featuredProducts.filter(p => p.isPreOrder).slice(0, 4);

  return (
    <div className={styles.container}>
      <ScrollReveal>
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
      </ScrollReveal>

      {/* Featured Items */}
      <ScrollReveal>
        <section className={`container ${styles.featured}`}>
          <div className={styles.sectionHeader}>
            <h2>Featured Collection</h2>
            <Link href="/shop" className={styles.viewAll}>View All</Link>
          </div>
          <div className={styles.grid}>
            {topFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* New Releases */}
      <ScrollReveal>
        <section className={`container ${styles.featured}`}>
          <div className={styles.sectionHeader}>
            <h2>New Releases</h2>
            <Link href="/shop?subCategory=All" className={styles.viewAll}>Shop New</Link>
          </div>
          <div className={styles.grid}>
            {newReleases.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* Pre-Orders */}
      <ScrollReveal>
        <section className={`container ${styles.featured}`}>
          <div className={styles.sectionHeader}>
            <h2>Pre-Orders</h2>
            <Link href="/shop?category=tcg" className={styles.viewAll}>Reserve Yours</Link>
          </div>
          <div className={styles.grid}>
            {preOrders.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* News & Events */}
      <ScrollReveal>
        <section className={`container ${styles.featured}`}>
          <div className={styles.sectionHeader}>
            <h2>News & Upcoming Events</h2>
          </div>
          <div className={styles.eventsGrid}>
            <div className={`glass-panel ${styles.eventCard}`}>
              <h3>Friday Night Magic</h3>
              <p className={styles.eventDate}>Every Friday @ 7:00 PM</p>
              <p>Join us for our weekly MTG Commander night. Prizes for top players!</p>
            </div>
            <div className={`glass-panel ${styles.eventCard}`}>
              <h3>Pokémon Trade & Play</h3>
              <p className={styles.eventDate}>Saturdays @ 12:00 PM</p>
              <p>Bring your binders! A family-friendly event for trading and learning to play.</p>
            </div>
            <div className={`glass-panel ${styles.eventCard}`}>
              <h3>New Set Release Party</h3>
              <p className={styles.eventDate}>Coming Next Month</p>
              <p>Midnight release draft event. Pre-register to secure your spot!</p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
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
      </ScrollReveal>
    </div>
  );
}
