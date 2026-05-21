"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/db';
import styles from './page.module.css';

export default function ShopClient({ initialProducts }: { initialProducts: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentMainCategory = searchParams.get('category') || 'All';
  const currentSubCategory = searchParams.get('subCategory') || 'All';

  // Extract unique main categories and subcategories
  const mainCategories = ['All', ...Array.from(new Set(initialProducts.map(p => p.category)))];
  const subCategories = ['All', ...Array.from(new Set(
    initialProducts
      .filter(p => currentMainCategory === 'All' || p.category === currentMainCategory)
      .map(p => p.subCategory)
  ))];

  // Filter products
  const filteredProducts = initialProducts.filter(item => {
    const matchMain = currentMainCategory === 'All' || item.category === currentMainCategory;
    const matchSub = currentSubCategory === 'All' || item.subCategory === currentSubCategory;
    return matchMain && matchSub;
  });

  const handleMainCategoryChange = (category: string) => {
    router.push(`/shop?category=${category}&subCategory=All`);
  };

  const handleSubCategoryChange = (subCategory: string) => {
    router.push(`/shop?category=${currentMainCategory}&subCategory=${subCategory}`);
  };

  return (
    <div className={styles.shopLayout}>
      <aside className={`glass-panel ${styles.sidebar}`}>
        <h3>Filters</h3>
        
        <div className={styles.filterSection}>
          <h4>Main Category</h4>
          <div className={styles.filterList}>
            {mainCategories.map(cat => (
              <button 
                key={cat}
                className={`${styles.filterBtn} ${currentMainCategory === cat ? styles.activeFilter : ''}`}
                onClick={() => handleMainCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterSection}>
          <h4>Subcategory</h4>
          <div className={styles.filterList}>
            {subCategories.map(sub => (
              <button 
                key={sub}
                className={`${styles.filterBtn} ${currentSubCategory === sub ? styles.activeFilter : ''}`}
                onClick={() => handleSubCategoryChange(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className={styles.productGrid}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {filteredProducts.length === 0 && (
          <div className={styles.emptyState}>No products found for these filters.</div>
        )}
      </main>
    </div>
  );
}
