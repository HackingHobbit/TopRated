import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/db';
import ProductDetailClient from './ProductDetailClient';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    // Renders the top-level app/not-found.tsx UI.
    notFound();
  }

  return (
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
          {product.isSale && (
            <span className={styles.originalPrice}>
              ${(product.price * 1.2).toFixed(2)}
            </span>
          )}
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
  );
}
