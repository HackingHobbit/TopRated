"use client";

import React, { createContext, useContext, useState, useMemo } from 'react';
import { Product } from '@/lib/db';
import { useToast } from '@/contexts/ToastContext';

interface WantListContextType {
  wantList: Product[];
  totalFavorites: number;
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
}

const WantListContext = createContext<WantListContextType | undefined>(undefined);

export function WantListProvider({ children }: { children: React.ReactNode }) {
  const [wantList, setWantList] = useState<Product[]>([]);
  const { addToast } = useToast();

  const totalFavorites = useMemo(() => wantList.length, [wantList]);

  const isFavorite = (productId: string) => {
    return wantList.some(p => p.id === productId);
  };

  const toggleFavorite = (product: Product) => {
    setWantList(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        addToast({
          title: "Removed from Want List",
          message: `${product.name} was removed from your favorites.`,
          type: "info"
        });
        return prev.filter(p => p.id !== product.id);
      } else {
        addToast({
          title: "Added to Want List",
          message: `${product.name} was saved to your favorites.`,
          type: "success"
        });
        return [...prev, product];
      }
    });
  };

  return (
    <WantListContext.Provider value={{ wantList, totalFavorites, toggleFavorite, isFavorite }}>
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
