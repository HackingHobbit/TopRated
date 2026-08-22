import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import ProductCard from '@/components/ProductCard';
import ScrollReveal from '@/components/ScrollReveal';
import type { Product } from '@/lib/types';

import { getProducts } from '@/lib/db';

interface ProductSectionProps {
  title: string;
  cta: { href: string; label: string };
  products: Product[];
}

function ProductSection({ title, cta, products }: ProductSectionProps) {
  if (products.length === 0) return null;
  return (
    <ScrollReveal>
      <section className={`container ${styles.featured}`}>
        <div className={styles.sectionHeader}>
          <h2>{title}</h2>
          <Link href={cta.href} className={styles.viewAll}>
            {cta.label}
          </Link>
        </div>
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

export default async function Home() {
  const allProducts = await getProducts();
  const topFeatured = allProducts.filter((p) => p.isFeatured).slice(0, 4);
  const newReleases = allProducts.filter((p) => p.isNewRelease).slice(0, 4);
  const preOrders = allProducts.filter((p) => p.isPreOrder).slice(0, 4);
  const deals = allProducts.filter((p) => p.isSale).slice(0, 4);

  return (
    <div className={styles.container}>
      <ScrollReveal>
        <section className={styles.hero}>
          <div className={styles.heroLogoWrapper}>
            <Image
              src="/assets/top-rated-logo.png"
              alt="Top Rated Cards & Collectibles"
              className={styles.heroLogo}
              width={360}
              height={120}
              priority
              sizes="(max-width: 600px) 60vw, 360px"
            />
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              The Ultimate <span className="text-gradient">Collection</span>{' '}
              Awaits.
            </h1>
            <p className={styles.subtitle}>
              Discover premium sealed products and rare singles. Your next big
              pull starts here.
            </p>
            <div className={styles.heroActions}>
              {/* Hero CTAs point to filters that actually have matches in the
                  seeded data — the old ?category=sealed / ?category=singles
                  returned an empty grid because no row uses those values. */}
              <Link href="/shop?category=sports" className="btn-primary">
                Shop Sports
              </Link>
              <Link href="/shop?category=tcg" className="btn-secondary">
                Browse TCG
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ProductSection
        title="Featured Collection"
        cta={{ href: '/shop', label: 'View All' }}
        products={topFeatured}
      />

      <ProductSection
        title="New Releases"
        cta={{ href: '/shop?new=1', label: 'Shop New' }}
        products={newReleases}
      />

      <ProductSection
        title="Pre-Orders"
        cta={{ href: '/shop?preorder=1', label: 'Reserve Yours' }}
        products={preOrders}
      />

      <ProductSection
        title="Deals"
        cta={{ href: '/shop?sale=1', label: 'Shop Deals' }}
        products={deals}
      />

      {/* News & Events */}
      <ScrollReveal>
        <section className={`container ${styles.featured}`}>
          <div className={styles.sectionHeader}>
            <h2>News &amp; Upcoming Events</h2>
          </div>
          <div className={styles.eventsGrid}>
            <div className={`glass-panel ${styles.eventCard}`}>
              <h3>Friday Night Magic</h3>
              <p className={styles.eventDate}>Every Friday @ 7:00 PM</p>
              <p>
                Join us for our weekly MTG Commander night. Prizes for top
                players!
              </p>
            </div>
            <div className={`glass-panel ${styles.eventCard}`}>
              <h3>Pokémon Trade &amp; Play</h3>
              <p className={styles.eventDate}>Saturdays @ 12:00 PM</p>
              <p>
                Bring your binders! A family-friendly event for trading and
                learning to play.
              </p>
            </div>
            <div className={`glass-panel ${styles.eventCard}`}>
              <h3>New Set Release Party</h3>
              <p className={styles.eventDate}>Coming Next Month</p>
              <p>
                Midnight release draft event. Pre-register to secure your spot!
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section id="visit" className={`container ${styles.visitUs}`}>
          <div className={`glass-panel ${styles.visitCard}`}>
            <div className={styles.visitContent}>
              <h2>Visit Our Store</h2>
              <p>
                Come browse our collection in person, trade with the community,
                and grab your favorite packs.
              </p>
              <div className={styles.addressInfo}>
                <strong>Top Rated Cards &amp; Collectibles</strong>
                <br />
                513 David Clayton Ln.
                <br />
                Windsor, CA 95492
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=513+David+Clayton+Ln.%2C+Windsor%2C+CA+95492"
                target="_blank"
                rel="noreferrer"
                className={`btn-primary ${styles.directionsBtn}`}
              >
                Get Directions
              </a>
            </div>
            <div className={styles.mapPlaceholder}>
              <iframe
                src="https://www.google.com/maps?q=513+David+Clayton+Ln.,+Windsor,+CA+95492&output=embed"
                title="Map to Top Rated Cards & Collectibles"
                className={styles.mapFrame}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
