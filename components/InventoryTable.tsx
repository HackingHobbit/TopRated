"use client";

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { updateProduct } from '@/lib/actions';
import { productType, TYPE_LABELS } from '@/lib/productFacets';
import ProductEditModal from './ProductEditModal';
import styles from './InventoryTable.module.css';

export default function InventoryTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'All' && p.category !== category) return false;
      if (type !== 'All' && productType(p) !== type) return false;
      if (
        q &&
        !(
          p.name.toLowerCase().includes(q) ||
          p.subCategory.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [products, query, category, type]);

  const toggleFlag = async (id: string, flag: keyof Product) => {
    setLoadingId(id);
    try {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const newValue = !product[flag];
      const updatedProduct = await updateProduct(id, { [flag]: newValue });
      setProducts(products.map((p) => (p.id === id ? updatedProduct : p)));
    } catch (err) {
      console.error(err);
      alert('Failed to update product flag.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Search by name, subcategory, or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>
          ))}
        </select>
        <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="All">All types</option>
          <option value="sealed">{TYPE_LABELS.sealed}</option>
          <option value="single">{TYPE_LABELS.single}</option>
          <option value="supplies">{TYPE_LABELS.supplies}</option>
        </select>
        <span className={styles.count}>
          {filtered.length} of {products.length}
        </span>
        {(query || category !== 'All' || type !== 'All') && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => { setQuery(''); setCategory('All'); setType('All'); }}
          >
            Clear
          </button>
        )}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>SubCategory</th>
            <th>Price</th>
            <th>Sale</th>
            <th>Featured</th>
            <th>New</th>
            <th>OOS</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((product) => (
            <tr key={product.id} className={loadingId === product.id ? styles.loading : ''}>
              <td>{product.name}</td>
              <td>{product.category}</td>
              <td>{product.subCategory}</td>
              <td>${product.price.toFixed(2)}</td>
              <td>
                <button onClick={() => toggleFlag(product.id, 'isSale')} className={product.isSale ? styles.flagOn : styles.flagOff}>
                  {product.isSale ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>
                <button onClick={() => toggleFlag(product.id, 'isFeatured')} className={product.isFeatured ? styles.flagOn : styles.flagOff}>
                  {product.isFeatured ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>
                <button onClick={() => toggleFlag(product.id, 'isNewRelease')} className={product.isNewRelease ? styles.flagOn : styles.flagOff}>
                  {product.isNewRelease ? 'ON' : 'OFF'}
                </button>
              </td>
              <td>
                <button onClick={() => toggleFlag(product.id, 'isOutOfStock')} className={product.isOutOfStock ? styles.flagOn : styles.flagOff}>
                  {product.isOutOfStock ? 'OOS' : 'IN'}
                </button>
              </td>
              <td>
                <button onClick={() => setEditingProduct(product)} className={styles.editBtn}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={9} className={styles.empty}>No products match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updated) => {
            setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
