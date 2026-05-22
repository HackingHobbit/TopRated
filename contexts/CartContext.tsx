"use client";

import React, { createContext, useContext, useState, useMemo } from 'react';
import { Product } from '@/lib/db';
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
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { addToast } = useToast();

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      
      if (existingItem) {
        // Enforce maximum 3 items per product rule
        if (existingItem.quantity >= 3) {
          addToast({
            title: "Limit Reached",
            message: "You can only add up to 3 of this item.",
            type: "error"
          });
          return prevCart; // Do not increase further
        }
        addToast({
          title: "Cart Updated",
          message: `Increased quantity of ${product.name} to ${existingItem.quantity + 1}.`,
          type: "success"
        });
        return prevCart.map((item) => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        addToast({
          title: "Added to Cart",
          message: `${product.name} was added to your cart.`,
          type: "success"
        });
        return [...prevCart, { product, quantity: 1 }];
      }
    });
    
    // Auto-open cart when an item is added
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
      const item = prevCart.find(i => i.product.id === productId);
      if (item) {
        addToast({
          title: "Removed from Cart",
          message: `${item.product.name} was removed.`,
          type: "info"
        });
      }
      return prevCart.filter((item) => item.product.id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    // Enforce max 3 items
    const limitedQuantity = Math.min(quantity, 3);
    
    setCart((prevCart) => 
      prevCart.map((item) => 
        item.product.id === productId
          ? { ...item, quantity: limitedQuantity }
          : item
      )
    );
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);
  
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
        clearCart
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
