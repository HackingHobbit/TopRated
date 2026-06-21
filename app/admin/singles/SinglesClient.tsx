'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/lib/types';
import { deleteSingle } from '@/lib/singleActions';
import styles from './singles.module.css';

export default function SinglesClient({ singles }: { singles: Product[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return singles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subCategory.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [singles, query]);

  // Group by top-level category, like the rest of the storefront taxonomy.
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.category || 'uncategorized';
      (map.get(key) ?? map.set(key, []).get(key)!).push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const remove = (p: Product) => {
    if (!confirm(`Delete “${p.name}”? This removes the card and its photos.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSingle(p.id);
      if (res.ok) {
        addToast({ title: 'Deleted', message: `${p.name} removed.`, type: 'info' });
        router.refresh();
      } else {
        addToast({
          title: 'Delete failed',
          message: res.error ?? 'Something went wrong.',
          type: 'error',
        });
      }
    });
  };

  return (
    <div>
      <input
        className={styles.search}
        placeholder="Search singles by name or category…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {grouped.length === 0 && (
        <div className={styles.emptyState}>
          <p>No singles yet.</p>
          <Link href="/admin/singles/new" className="btn-primary">
            Add your first single
          </Link>
        </div>
      )}

      {grouped.map(([category, items]) => (
        <section key={category} className={styles.categoryGroup}>
          <h2 className={styles.categoryHeading}>
            {category} <span className={styles.count}>{items.length}</span>
          </h2>
          <div className={`${styles.cardList} ${isPending ? styles.pending : ''}`}>
            {items.map((p) => (
              <div key={p.id} className={styles.singleRow}>
                <div className={styles.thumb}>
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={56}
                      height={56}
                      className={styles.thumbImg}
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <div className={styles.noThumb}>No photo</div>
                  )}
                </div>
                <div className={styles.rowInfo}>
                  <div className={styles.rowName}>{p.name}</div>
                  <div className={styles.rowMeta}>
                    {p.subCategory} · ${p.price.toFixed(2)}
                    {p.isOutOfStock && (
                      <span className={styles.oos}> · Out of stock</span>
                    )}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Link
                    href={`/admin/singles/${p.id}/edit`}
                    className={styles.iconAction}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    className={`${styles.iconAction} ${styles.danger}`}
                    onClick={() => remove(p)}
                    title="Delete"
                    disabled={isPending}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
