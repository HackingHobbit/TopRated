"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/types';
import styles from './page.module.css';

export default function ShopClient({ initialProducts }: { initialProducts: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentMainCategory = searchParams.get('category') || 'All';
  const currentSubCategory = searchParams.get('subCategory') || 'All';
  const urlSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);

  // Sync the local search input with ?search= when the URL changes (e.g.
  // navigating between dropdown items like ?search=Pokemon and ?search=Magic).
  // Without this the input keeps its first-mount value.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(urlSearch);
  }, [urlSearch]);
  const [sortBy, setSortBy] = useState('newest');
  
  // Toggles
  const [showOnlySale, setShowOnlySale] = useState(false);
  const [showOnlyPreOrder, setShowOnlyPreOrder] = useState(false);

  // Extract unique main categories and subcategories
  const mainCategories = ['All', ...Array.from(new Set(initialProducts.map(p => p.category)))];
  const subCategories = ['All', ...Array.from(new Set(
    initialProducts
      .filter(p => currentMainCategory === 'All' || p.category === currentMainCategory)
      .map(p => p.subCategory)
  ))];

  // Filter products
  const filteredProducts = useMemo(() => {
    const result = initialProducts.filter(item => {
      const matchMain = currentMainCategory === 'All' || item.category === currentMainCategory;
      const matchSub = currentSubCategory === 'All' || item.subCategory === currentSubCategory;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchSale = showOnlySale ? item.isSale : true;
      const matchPreOrder = showOnlyPreOrder ? item.isPreOrder : true;

      return matchMain && matchSub && matchSearch && matchSale && matchPreOrder;
    });

    // Sort products
    switch (sortBy) {
      case 'price_asc':
        return result.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return result.sort((a, b) => b.price - a.price);
      case 'name_asc':
        return result.sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
      default:
        // Mocking newest by putting new releases first
        return result.sort((a, b) => (b.isNewRelease ? 1 : 0) - (a.isNewRelease ? 1 : 0));
    }
  }, [initialProducts, currentMainCategory, currentSubCategory, searchQuery, showOnlySale, showOnlyPreOrder, sortBy]);

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
        
        <div className={styles.searchContainer}>
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterSection}>
          <h4>Sort By</h4>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.selectInput}
          >
            <option value="newest">Newest Additions</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
        </div>

        <div className={styles.filterSection}>
          <h4>Availability</h4>
          <div className={styles.filterList}>
            <label className={styles.toggleLabel}>
              <input 
                type="checkbox" 
                checked={showOnlySale}
                onChange={(e) => setShowOnlySale(e.target.checked)}
                className={styles.checkbox}
              />
              On Sale
            </label>
            <label className={styles.toggleLabel}>
              <input 
                type="checkbox" 
                checked={showOnlyPreOrder}
                onChange={(e) => setShowOnlyPreOrder(e.target.checked)}
                className={styles.checkbox}
              />
              Pre-Orders Only
            </label>
          </div>
        </div>

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
