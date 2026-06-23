"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DEFAULT_MAX_PER_ORDER } from "@/types/product";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  maxPerOrder?: number;
  stockQuantity?: number | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { maxPerOrder?: number; stockQuantity?: number | null; quantity?: number }) => void;
  removeItem: (id: string, size: string, color: string) => void;
  updateQuantity: (id: string, size: string, color: string, delta: number) => { success: boolean; reason?: string };
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  cartBounceKey: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "drma_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartBounceKey, setCartBounceKey] = useState(0);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // Compute the effective max for an item: min(maxPerOrder, stockQuantity)
  const getEffectiveMax = useCallback((item: CartItem): number => {
    const maxPerOrder = item.maxPerOrder ?? DEFAULT_MAX_PER_ORDER;
    const stock = item.stockQuantity;
    // If stock is tracked and finite, cap at stock level
    if (stock !== null && stock !== undefined && stock >= 0) {
      return Math.min(maxPerOrder, stock);
    }
    return maxPerOrder;
  }, []);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity"> & { maxPerOrder?: number; stockQuantity?: number | null; quantity?: number }) => {
    const requestedQty = newItem.quantity || 1;
    setItems(prev => {
      // Check for existing item with same id + size + color
      const existingIndex = prev.findIndex(
        i => i.id === newItem.id && i.selectedSize === newItem.selectedSize && i.selectedColor === newItem.selectedColor
      );
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const tempItem = { ...existing, maxPerOrder: newItem.maxPerOrder, stockQuantity: newItem.stockQuantity };
        const maxQty = getEffectiveMax(tempItem);
        const newQty = Math.min(existing.quantity + requestedQty, maxQty);
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty, maxPerOrder: newItem.maxPerOrder, stockQuantity: newItem.stockQuantity };
        return updated;
      }
      // Add as new item with requested quantity
      const tempItem = { ...newItem, quantity: requestedQty };
      const maxQty = getEffectiveMax(tempItem as CartItem);
      return [...prev, { ...newItem, quantity: Math.min(requestedQty, maxQty) }];
    });
    // Trigger bounce animation
    setCartBounceKey(k => k + 1);
  }, [getEffectiveMax]);

  const removeItem = useCallback((id: string, size: string, color: string) => {
    setItems(prev => prev.filter(
      i => !(i.id === id && i.selectedSize === size && i.selectedColor === color)
    ));
  }, []);

  const updateQuantity = useCallback((id: string, size: string, color: string, delta: number): { success: boolean; reason?: string } => {
    let result: { success: boolean; reason?: string } = { success: true };

    setItems(prev =>
      prev.map(item => {
        if (item.id === id && item.selectedSize === size && item.selectedColor === color) {
          const maxQty = getEffectiveMax(item);
          const newQty = item.quantity + delta;

          // Prevent going below 1
          if (newQty < 1) {
            return item;
          }

          // Enforce max per order / stock limit
          if (newQty > maxQty) {
            result = {
              success: false,
              reason: maxQty < (item.stockQuantity ?? Infinity)
                ? `Maximum ${maxQty} per order`
                : `Only ${item.stockQuantity} in stock`,
            };
            return item; // Don't update
          }

          return { ...item, quantity: newQty };
        }
        return item;
      })
    );

    return result;
  }, [getEffectiveMax]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, cartBounceKey }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}