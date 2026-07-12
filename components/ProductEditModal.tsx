'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Product } from '@/lib/types';
import { updateProduct } from '@/lib/actions';
import ImageSearchModal from './ImageSearchModal';
import styles from './ProductEditModal.module.css';

interface Props {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
}

export default function ProductEditModal({ product, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description,
    price: product.price,
    image: product.image,
    imageRepresentative: product.imageRepresentative ?? false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateProduct(product.id, {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        image: formData.image,
        imageRepresentative: formData.imageRepresentative
      });
      onSave(updated);
    } catch (error) {
      console.error(error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={`glass-panel ${styles.modal}`}>
        <h2>Edit Product</h2>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              required
              rows={4}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Price ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.price} 
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Image URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={e => setFormData({...formData, image: e.target.value})}
                required
              />
              <button
                type="button"
                className={styles.searchImageBtn}
                onClick={() => setShowSearch(true)}
              >
                <Search size={15} /> Search for Image
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={formData.imageRepresentative}
                onChange={e => setFormData({...formData, imageRepresentative: e.target.checked})}
              />
              Representative image — a close stand-in, not the exact item
              (shows a &ldquo;Representative image&rdquo; note to shoppers)
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {showSearch && (
          <ImageSearchModal
            initialQuery={formData.name}
            pathPrefix="enriched"
            onPick={(img) => {
              setFormData({ ...formData, image: img.url });
              setShowSearch(false);
            }}
            onClose={() => setShowSearch(false)}
          />
        )}
      </div>
    </div>
  );
}
