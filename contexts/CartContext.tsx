'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  totalItems: number;
  totalPrice: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
}

const PER_ITEM_LIMIT = 3;
const CART_STORAGE_KEY = 'tr_cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { addToast } = useToast();

  // Load the saved cart once on mount (client only). We start empty so the
  // server-rendered and first client render match, then hydrate from storage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(parsed);
      }
    } catch {
      /* corrupt or unavailable storage — start with an empty cart */
    }
    setHydrated(true);
  }, []);

  // Persist on every change — but only after the initial load, so the empty
  // starting state can't overwrite a saved cart.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [cart, hydrated]);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const addToCart = (product: Product, quantity: number = 1) => {
    // Defense in depth: never let an out-of-stock item into the cart, even
    // if some caller forgot to guard its button.
    if (product.isOutOfStock) {
      addToast({
        title: 'Out of Stock',
        message: `${product.name} is currently unavailable.`,
        type: 'error',
      });
      return;
    }

    // IMPORTANT: read `cart` here (outside the updater) and compute the
    // toast message + new cart state up front. React 19's concurrent
    // rendering can call setState updater functions more than once, so
    // they must be pure — no side effects like addToast() inside.
    const requested = Math.max(1, Math.floor(quantity));
    const existingItem = cart.find((item) => item.product.id === product.id);
    const currentQty = existingItem?.quantity ?? 0;
    const room = Math.max(0, PER_ITEM_LIMIT - currentQty);

    if (room === 0) {
      addToast({
        title: 'Limit Reached',
        message: 'You can only add up to 3 of this item.',
        type: 'error',
      });
      return;
    }

    const toAdd = Math.min(requested, room);
    const newQty = currentQty + toAdd;

    if (existingItem) {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        )
      );
      addToast({
        title: 'Cart Updated',
        message:
          toAdd === requested
            ? `Increased quantity of ${product.name} to ${newQty}.`
            : `Added ${toAdd} more (cart limit reached at ${newQty}).`,
        type: toAdd === requested ? 'success' : 'info',
      });
    } else {
      setCart((prev) => [...prev, { product, quantity: toAdd }]);
      addToast({
        title: 'Added to Cart',
        message:
          toAdd === requested
            ? `${product.name} was added to your cart.`
            : `Added ${toAdd} of ${product.name} (cart limit is 3).`,
        type: 'success',
      });
    }

    // Auto-open cart when an item is added
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
    if (item) {
      addToast({
        title: 'Removed from Cart',
        message: `${item.product.name} was removed.`,
        type: 'info',
      });
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const limitedQuantity = Math.min(quantity, PER_ITEM_LIMIT);
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: limitedQuantity }
          : item
      )
    );
  };

  const toggleCart = () => setIsCartOpen((open) => !open);

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        totalItems,
        totalPrice,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
