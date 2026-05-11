"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import styles from './page.module.css';

const MOCK_INVENTORY = [
  { id: '1', name: 'Premium Hobby Box', price: 199.99, image: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600&q=80', category: 'sealed' as const },
  { id: '2', name: 'Vintage Graded PSA 10', price: 499.50, image: 'https://images.unsplash.com/photo-1605638202580-2c7001402245?w=600&q=80', category: 'singles' as const },
  { id: '3', name: 'Rookie Autograph /99', price: 150.00, image: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=600&q=80', category: 'singles' as const },
  { id: '4', name: 'Retail Blaster Box', price: 29.99, image: 'https://images.unsplash.com/photo-1644329843491-9988a896323c?w=600&q=80', category: 'sealed' as const },
  { id: '5', name: 'Elite Draft Picks Box', price: 120.00, image: 'https://images.unsplash.com/photo-1598155523122-3842334d6c1f?w=600&q=80', category: 'sealed' as const },
  { id: '6', name: 'Base Set Holographic', price: 85.00, image: 'https://images.unsplash.com/photo-1620330104595-654cc3bdfab1?w=600&q=80', category: 'singles' as const },
  { id: '7', name: 'Collector\'s Tin 2024', price: 45.00, image: 'https://images.unsplash.com/photo-1645366472403-1c3ce4bf8cc6?w=600&q=80', category: 'sealed' as const },
  { id: '8', name: 'Signed Memorabilia Card', price: 350.00, image: 'https://images.unsplash.com/photo-1590487372990-2804245607db?w=600&q=80', category: 'singles' as const },
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
