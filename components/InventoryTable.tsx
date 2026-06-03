"use client";

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { updateProduct } from '@/lib/actions';
import ProductEditModal from './ProductEditModal';
import styles from './InventoryTable.module.css';

export default function InventoryTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const toggleFlag = async (id: string, flag: keyof Product) => {
    setLoadingId(id);
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;
      
      const newValue = !product[flag];
      const updatedProduct = await updateProduct(id, { [flag]: newValue });
      
      setProducts(products.map(p => p.id === id ? updatedProduct : p));
    } catch (err) {
      console.error(err);
      alert('Failed to update product flag.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className={styles.tableWrapper}>
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
          {products.map(product => (
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
        </tbody>
      </table>
      {editingProduct && (
        <ProductEditModal 
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updated) => {
            setProducts(products.map(p => p.id === updated.id ? updated : p));
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
