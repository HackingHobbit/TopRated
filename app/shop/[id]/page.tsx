import Image from 'next/image';
import { Info } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductById } from '@/lib/db';
import { absoluteUrl } from '@/lib/site';
import ProductDetailClient from './ProductDetailClient';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) {
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    };
  }

  const description = product.description || `Shop ${product.name} at Top Rated Cards & Collectibles.`;
  const image = product.image.startsWith('http')
    ? product.image
    : absoluteUrl(product.image);

  return {
    title: product.name,
    description,
    alternates: { canonical: `/shop/${encodeURIComponent(product.id)}` },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      url: `/shop/${encodeURIComponent(product.id)}`,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    // Renders the top-level app/not-found.tsx UI.
    notFound();
  }

  const productImage = product.image.startsWith('http')
    ? product.image
    : absoluteUrl(product.image);
  const availability = product.isOutOfStock
    ? 'https://schema.org/OutOfStock'
    : product.isPreOrder
      ? 'https://schema.org/PreOrder'
      : 'https://schema.org/InStock';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: [productImage],
    sku: product.id,
    category: product.subCategory,
    brand: {
      '@type': 'Brand',
      name: 'Top Rated Cards & Collectibles',
    },
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/shop/${encodeURIComponent(product.id)}`),
      priceCurrency: 'USD',
      price: product.price.toFixed(2),
      availability,
      seller: {
        '@type': 'Organization',
        name: 'Top Rated Cards & Collectibles',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <div className={`container ${styles.pdpContainer}`}>
      <div className={styles.imageSection}>
        <div className={styles.mainImageWrapper}>
          <Image
            src={product.image}
            alt={product.name}
            className={styles.mainImage}
            width={600}
            height={800}
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
          />

          <div className={styles.badges}>
            {(product.category === 'sports' || product.category === 'tcg') && (
              <span className={`${styles.badge} ${styles.typeBadge}`}>
                {product.isSealed ? 'Sealed' : 'Single'}
              </span>
            )}
            {product.isOutOfStock && (
              <span className={`${styles.badge} ${styles.saleBadge}`}>
                Out of Stock
              </span>
            )}
            {product.isSale && (
              <span className={`${styles.badge} ${styles.saleBadge}`}>Sale</span>
            )}
            {product.isPreOrder && (
              <span className={`${styles.badge} ${styles.preOrderBadge}`}>
                Pre-Order
              </span>
            )}
            {product.isNewRelease && (
              <span className={`${styles.badge} ${styles.newBadge}`}>New</span>
            )}
          </div>
        </div>

        {product.imageRepresentative && (
          <p className={styles.imageNote}>
            <Info size={15} aria-hidden />
            <span>
              <strong>Representative image.</strong> The exact item you receive
              may vary slightly in appearance (edition, year, or printing).
            </span>
          </p>
        )}
      </div>

      <div className={styles.detailsSection}>
        <div className={styles.breadcrumbs}>
          <span>Shop</span> &gt;{' '}
          <span style={{ textTransform: 'capitalize' }}>{product.category}</span>{' '}
          &gt; <span>{product.subCategory}</span>
        </div>

        <h1 className={styles.title}>{product.name}</h1>

        <div className={styles.priceBlock}>
          <span className={styles.price}>${product.price.toFixed(2)}</span>
        </div>

        <p className={styles.description}>
          {product.description}
          <br />
          <br />
          {product.isSealed
            ? 'Sealed factory product, authenticity guaranteed by Top Rated Cards & Collectibles.'
            : product.category === 'memorabilia'
              ? 'Authenticated memorabilia with certificate of authenticity. Stored and shipped with care.'
              : 'Stocked in-store and ready to ship from Top Rated Cards & Collectibles.'}
        </p>

        <div className={styles.actionBlock}>
          <ProductDetailClient product={product} />
        </div>
      </div>
      </div>
    </>
  );
}
