'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  addItemToBasket,
  calculateBasketItemCount,
  removeBasketItem,
  updateBasketItemQuantity,
  type BasketItem,
} from './basket-helpers';

export type { BasketItem };

export interface BasketContextValue {
  items: BasketItem[];
  itemCount: number;
  isMounted: boolean;
  addItem: (item: Omit<BasketItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
  ) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  clearBasket: () => void;
}

const BasketContext = createContext<BasketContextValue | undefined>(undefined);

const STORAGE_KEY = 'palnadu_quote_basket';

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage write errors
    }
  }, [items, isMounted]);

  const addItem = (item: Omit<BasketItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => addItemToBasket(prev, item, quantity));
  };

  const updateQuantity = (
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
  ) => {
    setItems((prev) => updateBasketItemQuantity(prev, productId, variantId, quantity));
  };

  const removeItem = (productId: string, variantId?: string | null) => {
    setItems((prev) => removeBasketItem(prev, productId, variantId));
  };

  const clearBasket = () => {
    setItems([]);
  };

  const itemCount = calculateBasketItemCount(items);

  return (
    <BasketContext.Provider
      value={{
        items,
        itemCount,
        isMounted,
        addItem,
        updateQuantity,
        removeItem,
        clearBasket,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket(): BasketContextValue {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
}
