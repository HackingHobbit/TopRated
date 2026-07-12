'use client';

// "Search for Image" modal — the same find-and-pick flow as the review tool,
// embedded in the product editors. Runs an admin-only server search (local
// SearXNG) and re-hosts the chosen image into Supabase before handing it back.
// Works when the admin is run locally with SearXNG up; on the deployed site the
// search returns a friendly "run locally" message.

import { useCallback, useEffect, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchImages, importImageFromUrl } from '@/lib/imageSearchActions';
import type { ImageCandidate } from '@/lib/types';
import styles from './ImageSearchModal.module.css';

interface Props {
  initialQuery: string;
  /** Storage folder for the re-hosted image, e.g. 'singles' or 'enriched'. */
  pathPrefix?: string;
  onPick: (image: { url: string; path: string }) => void;
  onClose: () => void;
}

export default function ImageSearchModal({
  initialQuery,
  pathPrefix = 'enriched',
  onPick,
  onClose,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [importing, setImporting] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    const res = await searchImages(q);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Search failed.');
      setCandidates([]);
      return;
    }
    setCandidates(res.candidates ?? []);
    if (!res.candidates?.length) {
      setError('No images found — try a different search.');
    }
  }, []);

  useEffect(() => {
    // Auto-run the search when the modal opens (seeded with the product name).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  const addPasted = () => {
    const u = paste.trim();
    if (!/^https?:\/\//i.test(u)) {
      setError('Paste a full image URL starting with http(s)://');
      return;
    }
    let host = '';
    try {
      host = new URL(u).hostname;
    } catch {
      /* ignore */
    }
    setCandidates((c) => [
      { url: u, thumb: u, page: u, host, resolution: 'pasted', w: 0, h: 0, score: 9999, engine: 'pasted' },
      ...c,
    ]);
    setSelected(u);
    setPaste('');
    setError(null);
  };

  const useSelected = async () => {
    if (!selected) return;
    setImporting(true);
    setError(null);
    const res = await importImageFromUrl(selected, pathPrefix);
    setImporting(false);
    if (!res.ok || !res.image) {
      setError(res.error ?? 'Could not import that image — try another.');
      return;
    }
    onPick(res.image);
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.head}>
          <h3>Search for an image</h3>
          <button className={styles.close} onClick={onClose} aria-label="Close" disabled={importing}>
            <X size={20} />
          </button>
        </div>

        <form
          className={styles.searchRow}
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product images…"
            autoFocus
          />
          <button type="submit" disabled={loading}>
            <Search size={16} /> Search
          </button>
        </form>

        {loading && (
          <p className={styles.status}>
            <Loader2 size={16} className={styles.spin} /> Searching…
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.grid}>
          {candidates.map((c) => (
            <button
              type="button"
              key={c.url}
              className={`${styles.card} ${selected === c.url ? styles.sel : ''}`}
              onClick={() => setSelected(c.url)}
              title={c.page}
            >
              {/* Arbitrary remote hosts — a plain img is correct here; next/image
                  would need every vendor domain whitelisted in remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.thumb || c.url}
                alt=""
                loading="lazy"
                // Bing/Google thumbnail CDNs 403 when a cross-origin referrer
                // is sent; suppress it so the previews actually render. Fall
                // back to the full image if the thumbnail still fails.
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (c.url && img.src !== c.url) {
                    img.src = c.url;
                  } else {
                    img.style.opacity = '0.2';
                  }
                }}
              />
              <span className={styles.meta}>
                {c.host || 'source'}
                {c.resolution ? ` · ${c.resolution}` : ''}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.pasteRow}>
          <input
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="…or paste an image URL from a vendor page"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPasted();
              }
            }}
          />
          <button type="button" onClick={addPasted}>
            Add
          </button>
        </div>

        <div className={styles.foot}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={useSelected}
            disabled={!selected || importing}
          >
            {importing ? 'Adding…' : 'Use this image'}
          </button>
        </div>
      </div>
    </div>
  );
}
