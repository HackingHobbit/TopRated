'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';

interface WantListContextType {
  wantList: Product[];
  totalFavorites: number;
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
}

const WANTLIST_STORAGE_KEY = 'tr_wantlist';

const WantListContext = createContext<WantListContextType | undefined>(
  undefined
);

export function WantListProvider({ children }: { children: React.ReactNode }) {
  const [wantList, setWantList] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { addToast } = useToast();

  // Load the saved want list once on mount (client only). We start empty so
  // the server-rendered and first client render match, then hydrate from
  // storage — same pattern as CartContext.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WANTLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWantList(parsed);
      }
    } catch {
      /* corrupt or unavailable storage — start with an empty want list */
    }
    setHydrated(true);
  }, []);

  // Persist on every change — but only after the initial load, so the empty
  // starting state can't overwrite a saved want list.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(WANTLIST_STORAGE_KEY, JSON.stringify(wantList));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [wantList, hydrated]);

  const totalFavorites = useMemo(() => wantList.length, [wantList]);

  const isFavorite = (productId: string) =>
    wantList.some((p) => p.id === productId);

  const toggleFavorite = (product: Product) => {
    // Compute branch + toast intent OUTSIDE the setState updater so the
    // updater stays pure. Calling addToast (a setState on ToastProvider)
    // from inside another component's updater is the exact pattern React
    // forbids in concurrent rendering.
    const exists = wantList.some((p) => p.id === product.id);
    if (exists) {
      setWantList((prev) => prev.filter((p) => p.id !== product.id));
      addToast({
        title: 'Removed from Want List',
        message: `${product.name} was removed from your favorites.`,
        type: 'info',
      });
    } else {
      setWantList((prev) => [...prev, product]);
      addToast({
        title: 'Added to Want List',
        message: `${product.name} was saved to your favorites.`,
        type: 'success',
      });
    }
  };

  return (
    <WantListContext.Provider
      value={{ wantList, totalFavorites, toggleFavorite, isFavorite }}
    >
      {children}
    </WantListContext.Provider>
  );
}

export function useWantList() {
  const context = useContext(WantListContext);
  if (context === undefined) {
    throw new Error('useWantList must be used within a WantListProvider');
  }
  return context;
}
