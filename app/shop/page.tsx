"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import styles from './page.module.css';

const MOCK_INVENTORY = [
  { id: '1', name: 'Premium Hobby Box', price: 199.99, image: '/assets/4244.JPG', category: 'sealed' as const },
  { id: '2', name: 'Vintage Graded PSA 10', price: 499.50, image: '/assets/4242.JPG', category: 'singles' as const },
  { id: '3', name: 'Rookie Autograph /99', price: 150.00, image: '/assets/4231.JPG', category: 'singles' as const },
  { id: '4', name: 'Retail Blaster Box', price: 29.99, image: '/assets/4210.JPG', category: 'sealed' as const },
  { id: '5', name: 'Elite Draft Picks Box', price: 120.00, image: '/assets/4211.JPG', category: 'sealed' as const },
  { id: '6', name: 'Base Set Holographic', price: 85.00, image: '/assets/4215.JPG', category: 'singles' as const },
  { id: '7', name: 'Collector\'s Tin 2024', price: 45.00, image: '/assets/4213.JPG', category: 'sealed' as const },
  { id: '8', name: 'Signed Memorabilia Card', price: 350.00, image: '/assets/4226.JPG', category: 'singles' as const },
];

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  
  const [filter, setFilter] = useState<string>(initialCategory);

  const filteredProducts = filter === 'all' 
    ? MOCK_INVENTORY 
    : MOCK_INVENTORY.filter(p => p.category === filter);

  return (
    <>
      <div className={styles.filters}>
        <button 
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Items
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'sealed' ? styles.active : ''}`}
          onClick={() => setFilter('sealed')}
        >
          Packaged / Sealed
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'singles' ? styles.active : ''}`}
          onClick={() => setFilter('singles')}
        >
          Individual Cards
        </button>
      </div>

      <div className={styles.grid}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className={styles.emptyState}>
          <p>No products found in this category.</p>
        </div>
      )}
    </>
  );
}

export default function Shop() {
  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.header}>
        <h1>Shop Inventory</h1>
        <p className={styles.subtitle}>Discover rare singles and premium sealed products.</p>
      </div>

      <Suspense fallback={<div>Loading inventory...</div>}>
        <ShopContent />
      </Suspense>
    </div>
  );
}
