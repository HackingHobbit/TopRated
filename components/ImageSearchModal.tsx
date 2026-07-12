'use client';

// "Search for Image" modal — the same find-and-pick flow as the review tool,
// embedded in the product editors. Runs the admin-only aggregate image search
// and re-hosts the chosen image into Supabase before handing it back. Includes
// a zoom lightbox so you can inspect a candidate at full size before picking.

import { useCallback, useEffect, useState } from 'react';
import { Search, X, Loader2, ZoomIn, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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
  // Zoom lightbox
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [zoom2x, setZoom2x] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);

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

  // Progressive load for the lightbox: show the (cached) thumbnail instantly,
  // swap in the full-res image once it finishes loading in the background.
  useEffect(() => {
    if (zoomIndex === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullLoaded(false);
    const c = candidates[zoomIndex];
    if (!c || !c.url || c.url === c.thumb) {
      setFullLoaded(true);
      return;
    }
    const img = new window.Image();
    img.onload = () => setFullLoaded(true);
    img.src = c.url;
    return () => {
      img.onload = null;
    };
  }, [zoomIndex, candidates]);

  const closeZoom = () => {
    setZoomIndex(null);
    setZoom2x(false);
  };
  const zoomNav = (d: number) =>
    setZoomIndex((i) => (i === null ? i : (i + d + candidates.length) % candidates.length));

  // Keyboard controls while the lightbox is open.
  useEffect(() => {
    if (zoomIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeZoom();
      else if (e.key === 'ArrowLeft') zoomNav(-1);
      else if (e.key === 'ArrowRight') zoomNav(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomIndex, candidates.length]);

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

  const importAndPick = async (url: string) => {
    setImporting(true);
    setError(null);
    const res = await importImageFromUrl(url, pathPrefix);
    setImporting(false);
    if (!res.ok || !res.image) {
      setError(res.error ?? 'Could not import that image — try another.');
      return;
    }
    onPick(res.image);
  };

  const zoomed = zoomIndex !== null ? candidates[zoomIndex] : null;

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
          {candidates.map((c, i) => (
            <div
              key={c.url}
              role="button"
              tabIndex={0}
              className={`${styles.card} ${selected === c.url ? styles.sel : ''}`}
              onClick={() => setSelected(c.url)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(c.url);
                }
              }}
              title={c.page}
            >
              {/* Zoom — opens the lightbox without selecting. */}
              <button
                type="button"
                className={styles.zoomBtn}
                title="Zoom"
                aria-label="Zoom image"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex(i);
                }}
              >
                <ZoomIn size={15} />
              </button>
              {/* Arbitrary remote hosts — a plain img is correct here; next/image
                  would need every vendor domain whitelisted in remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.thumb || c.url}
                alt=""
                loading="lazy"
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
            </div>
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
            onClick={() => selected && importAndPick(selected)}
            disabled={!selected || importing}
          >
            {importing ? 'Adding…' : 'Use this image'}
          </button>
        </div>
      </div>

      {/* Zoom lightbox */}
      {zoomed && (
        <div
          className={styles.lb}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeZoom();
          }}
        >
          <div className={styles.lbBar}>
            <span className={styles.lbInfo}>
              {zoomIndex! + 1}/{candidates.length}
              {zoomed.host ? ` · ${zoomed.host}` : ''}
              {zoomed.resolution ? ` · ${zoomed.resolution}` : ''}
              {!fullLoaded && zoomed.url !== zoomed.thumb && (
                <span className={styles.lbLoad}> · loading full-res…</span>
              )}
            </span>
            <a href={zoomed.page || zoomed.url} target="_blank" rel="noopener noreferrer" className={styles.lbSource}>
              source <ExternalLink size={13} />
            </a>
            <span className={styles.lbSpacer} />
            <button
              type="button"
              className="btn-primary"
              onClick={() => importAndPick(zoomed.url)}
              disabled={importing}
            >
              {importing ? 'Adding…' : 'Use this image'}
            </button>
            <button type="button" className={styles.lbClose} onClick={closeZoom} aria-label="Close zoom">
              <X size={20} />
            </button>
          </div>
          {candidates.length > 1 && (
            <button type="button" className={`${styles.lbNav} ${styles.lbPrev}`} onClick={() => zoomNav(-1)} aria-label="Previous">
              <ChevronLeft size={28} />
            </button>
          )}
          <div className={styles.lbStage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={`${styles.lbImg} ${zoom2x ? styles.z2 : ''}`}
              src={fullLoaded ? zoomed.url : zoomed.thumb || zoomed.url}
              alt=""
              referrerPolicy="no-referrer"
              onClick={() => setZoom2x((z) => !z)}
            />
          </div>
          {candidates.length > 1 && (
            <button type="button" className={`${styles.lbNav} ${styles.lbNext}`} onClick={() => zoomNav(1)} aria-label="Next">
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
