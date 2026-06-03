'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';

interface WantListContextType {
  wantList: Product[];
  totalFavorites: number;
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
}

const WantListContext = createContext<WantListContextType | undefined>(
  undefined
);

export function WantListProvider({ children }: { children: React.ReactNode }) {
  const [wantList, setWantList] = useState<Product[]>([]);
  const { addToast } = useToast();

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
