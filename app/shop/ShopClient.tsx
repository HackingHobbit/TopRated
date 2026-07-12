"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/lib/types';
import {
  productType,
  deriveYear,
  deriveFormat,
  TYPE_LABELS,
  type ProductType,
} from '@/lib/productFacets';
import styles from './page.module.css';

const TYPE_ORDER: ProductType[] = ['sealed', 'single', 'supplies'];
const SORTS: Array<[string, string]> = [
  ['newest', 'Newest Additions'],
  ['price_asc', 'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['name_asc', 'Name: A to Z'],
];

export default function ShopClient({ initialProducts }: { initialProducts: Product[] }) {
  const sp = useSearchParams();
  const router = useRouter();

  // All filters are URL-driven so navbar links, homepage CTAs, and shared URLs
  // stay consistent. Search stays local (live filter) but seeds from ?search=.
  const type = (sp.get('type') || '') as ProductType | '';
  const category = sp.get('category') || 'All';
  const subCategory = sp.get('subCategory') || 'All';
  const year = sp.get('year') || 'All';
  const format = sp.get('format') || 'All';
  const onlySale = sp.get('sale') === '1';
  const onlyPre = sp.get('preorder') === '1';
  const onlyNew = sp.get('new') === '1';
  const inStock = sp.get('instock') === '1';
  const minPrice = sp.get('min') ? Number(sp.get('min')) : null;
  const maxPrice = sp.get('max') ? Number(sp.get('max')) : null;
  const sort = sp.get('sort') || 'newest';
  const urlSearch = sp.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(Array.from(sp.entries()));
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || v === 'All') next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.push(qs ? `/shop?${qs}` : '/shop');
    },
    [sp, router]
  );

  const toggleFlag = (key: string) => setParam({ [key]: sp.get(key) === '1' ? null : '1' });

  // ---- Contextual facet option lists (only show options that can yield hits)
  const typeFiltered = useMemo(
    () => (type ? initialProducts.filter((p) => productType(p) === type) : initialProducts),
    [initialProducts, type]
  );
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(typeFiltered.map((p) => p.category))).sort()],
    [typeFiltered]
  );
  const catFiltered = useMemo(
    () => typeFiltered.filter((p) => category === 'All' || p.category === category),
    [typeFiltered, category]
  );
  const subCategories = useMemo(
    () => ['All', ...Array.from(new Set(catFiltered.map((p) => p.subCategory))).sort()],
    [catFiltered]
  );
  const years = useMemo(() => {
    const ys = new Set<string>();
    catFiltered.forEach((p) => {
      const y = deriveYear(p.name);
      if (y) ys.add(y);
    });
    return ['All', ...Array.from(ys).sort((a, b) => Number(b) - Number(a))];
  }, [catFiltered]);
  const formats = useMemo(() => {
    const fs = new Set<string>();
    catFiltered.forEach((p) => {
      const f = deriveFormat(p.name);
      if (f) fs.add(f);
    });
    return ['All', ...Array.from(fs).sort()];
  }, [catFiltered]);

  // ---- The filtered + sorted product list
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = initialProducts.filter((p) => {
      if (type && productType(p) !== type) return false;
      if (category !== 'All' && p.category !== category) return false;
      if (subCategory !== 'All' && p.subCategory !== subCategory) return false;
      if (year !== 'All' && deriveYear(p.name) !== year) return false;
      if (format !== 'All' && deriveFormat(p.name) !== format) return false;
      if (onlySale && !p.isSale) return false;
      if (onlyPre && !p.isPreOrder) return false;
      if (onlyNew && !p.isNewRelease) return false;
      if (inStock && p.isOutOfStock) return false;
      if (minPrice != null && p.price < minPrice) return false;
      if (maxPrice != null && p.price > maxPrice) return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)))
        return false;
      return true;
    });

    switch (sort) {
      case 'price_asc':
        return [...result].sort((a, b) => a.price - b.price);
      case 'price_desc':
        return [...result].sort((a, b) => b.price - a.price);
      case 'name_asc':
        return [...result].sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
      default:
        return [...result].sort((a, b) => (b.isNewRelease ? 1 : 0) - (a.isNewRelease ? 1 : 0));
    }
  }, [
    initialProducts, type, category, subCategory, year, format,
    onlySale, onlyPre, onlyNew, inStock, minPrice, maxPrice, searchQuery, sort,
  ]);

  // ---- Active-filter chips (for a clear, consistent "what's applied" view)
  const chips: Array<{ label: string; clear: () => void }> = [];
  if (type) chips.push({ label: TYPE_LABELS[type], clear: () => setParam({ type: null }) });
  if (category !== 'All') chips.push({ label: category, clear: () => setParam({ category: null, subCategory: null }) });
  if (subCategory !== 'All') chips.push({ label: subCategory, clear: () => setParam({ subCategory: null }) });
  if (year !== 'All') chips.push({ label: year, clear: () => setParam({ year: null }) });
  if (format !== 'All') chips.push({ label: format, clear: () => setParam({ format: null }) });
  if (inStock) chips.push({ label: 'In Stock', clear: () => setParam({ instock: null }) });
  if (onlySale) chips.push({ label: 'On Sale', clear: () => setParam({ sale: null }) });
  if (onlyPre) chips.push({ label: 'Pre-Order', clear: () => setParam({ preorder: null }) });
  if (onlyNew) chips.push({ label: 'New', clear: () => setParam({ new: null }) });
  if (minPrice != null) chips.push({ label: `Min $${minPrice}`, clear: () => setParam({ min: null }) });
  if (maxPrice != null) chips.push({ label: `Max $${maxPrice}`, clear: () => setParam({ max: null }) });
  const clearAll = () => {
    setSearchQuery('');
    router.push('/shop');
  };

  return (
    <div className={styles.shopLayout}>
      <aside className={`glass-panel ${styles.sidebar}`}>
        <button
          type="button"
          className={styles.filtersToggle}
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={18} />
          {filtersOpen ? 'Hide Filters' : 'Filters & Sort'}
        </button>

        <div className={`${styles.filterPanel} ${filtersOpen ? styles.filterPanelOpen : ''}`}>
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
            <h4>Product Type</h4>
            <div className={styles.filterList}>
              <button
                className={`${styles.filterBtn} ${!type ? styles.activeFilter : ''}`}
                onClick={() => setParam({ type: null })}
              >
                All
              </button>
              {TYPE_ORDER.map((t) => (
                <button
                  key={t}
                  className={`${styles.filterBtn} ${type === t ? styles.activeFilter : ''}`}
                  onClick={() => setParam({ type: t })}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <h4>Sort By</h4>
            <select
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className={styles.selectInput}
            >
              {SORTS.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterSection}>
            <h4>Availability</h4>
            <div className={styles.filterList}>
              <label className={styles.toggleLabel}>
                <input type="checkbox" checked={inStock} onChange={() => toggleFlag('instock')} className={styles.checkbox} />
                In Stock
              </label>
              <label className={styles.toggleLabel}>
                <input type="checkbox" checked={onlySale} onChange={() => toggleFlag('sale')} className={styles.checkbox} />
                On Sale
              </label>
              <label className={styles.toggleLabel}>
                <input type="checkbox" checked={onlyPre} onChange={() => toggleFlag('preorder')} className={styles.checkbox} />
                Pre-Orders
              </label>
              <label className={styles.toggleLabel}>
                <input type="checkbox" checked={onlyNew} onChange={() => toggleFlag('new')} className={styles.checkbox} />
                New Releases
              </label>
            </div>
          </div>

          <div className={styles.filterSection}>
            <h4>Main Category</h4>
            <div className={styles.filterList}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${category === cat ? styles.activeFilter : ''}`}
                  onClick={() => setParam({ category: cat, subCategory: null })}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {subCategories.length > 1 && (
            <div className={styles.filterSection}>
              <h4>Subcategory</h4>
              <div className={styles.filterList}>
                {subCategories.map((sub) => (
                  <button
                    key={sub}
                    className={`${styles.filterBtn} ${subCategory === sub ? styles.activeFilter : ''}`}
                    onClick={() => setParam({ subCategory: sub })}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {years.length > 1 && (
            <div className={styles.filterSection}>
              <h4>Year</h4>
              <div className={styles.filterList}>
                {years.map((y) => (
                  <button
                    key={y}
                    className={`${styles.filterBtn} ${year === y ? styles.activeFilter : ''}`}
                    onClick={() => setParam({ year: y })}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formats.length > 1 && (
            <div className={styles.filterSection}>
              <h4>Format</h4>
              <div className={styles.filterList}>
                {formats.map((f) => (
                  <button
                    key={f}
                    className={`${styles.filterBtn} ${format === f ? styles.activeFilter : ''}`}
                    onClick={() => setParam({ format: f })}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.filterSection}>
            <h4>Price</h4>
            <div className={styles.priceRow}>
              <input
                type="number"
                min="0"
                placeholder="Min"
                defaultValue={minPrice ?? ''}
                className={styles.priceInput}
                onBlur={(e) => setParam({ min: e.target.value || null })}
                onKeyDown={(e) => { if (e.key === 'Enter') setParam({ min: (e.target as HTMLInputElement).value || null }); }}
              />
              <span className={styles.priceDash}>–</span>
              <input
                type="number"
                min="0"
                placeholder="Max"
                defaultValue={maxPrice ?? ''}
                className={styles.priceInput}
                onBlur={(e) => setParam({ max: e.target.value || null })}
                onKeyDown={(e) => { if (e.key === 'Enter') setParam({ max: (e.target as HTMLInputElement).value || null }); }}
              />
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.productMain}>
        <div className={styles.resultBar}>
          <span className={styles.resultCount}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </span>
          {(chips.length > 0 || searchQuery) && (
            <div className={styles.chips}>
              {searchQuery && (
                <button className={styles.chip} onClick={() => setSearchQuery('')}>
                  “{searchQuery}” <X size={13} />
                </button>
              )}
              {chips.map((c, i) => (
                <button key={i} className={styles.chip} onClick={c.clear}>
                  {c.label} <X size={13} />
                </button>
              ))}
              <button className={styles.clearAll} onClick={clearAll}>Clear all</button>
            </div>
          )}
        </div>

        <div className={styles.productGrid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <div className={styles.emptyState}>
            No products match these filters.{' '}
            <button className={styles.clearAllInline} onClick={clearAll}>Clear filters</button>
          </div>
        )}
      </main>
    </div>
  );
}
