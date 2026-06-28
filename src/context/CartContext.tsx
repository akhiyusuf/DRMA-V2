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

export interface LastAddedInfo {
  name: string;
  quantity: number;
  timestamp: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { maxPerOrder?: number; stockQuantity?: number | null; quantity?: number }) => boolean;
  removeItem: (id: string, size: string, color: string) => void;
  updateQuantity: (id: string, size: string, color: string, delta: number) => { success: boolean; reason?: string };
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  cartBounceKey: number;
  lastAddedInfo: LastAddedInfo | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "drma_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartBounceKey, setCartBounceKey] = useState(0);
  const [lastAddedInfo, setLastAddedInfo] = useState<LastAddedInfo | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    let migrated = false;
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        let parsed: CartItem[] = JSON.parse(stored);

        // MED-02: Migrate legacy product IDs (p1..p10) to nanoids.
        // After the ID migration, any cart in a returning visitor's browser
        // will still reference the old sequential IDs. We detect them by
        // pattern and fetch the new IDs from /api/products (which returns
        // the legacy_id alongside the new id). Items that don't match the
        // legacy pattern are left untouched.
        const LEGACY_ID_PATTERN = /^p\d+$/;
        const hasLegacyIds = parsed.some(item => LEGACY_ID_PATTERN.test(item.id));

        if (hasLegacyIds) {
          // Build a legacy→new ID map from the public products API
          // (we can't use supabaseAdmin here — this is client-side)
          fetch('/api/products')
            .then(res => res.ok ? res.json() : [])
            .then((products: any[]) => {
              // The public API returns new IDs but not legacy_id (for security).
              // However, since we can't get legacy_id from the public API, we
              // match by name+price instead — which is stable for these 10
              // products. This is a one-time migration; after it runs, the
              // cart will have the new IDs and this branch won't execute again.
              const legacyItems = parsed.filter(item => LEGACY_ID_PATTERN.test(item.id));
              const updatedItems = [...parsed];

              for (const legacyItem of legacyItems) {
                // Match by name (the most reliable field available client-side)
                const match = products.find(p => p.name === legacyItem.name);
                if (match && !LEGACY_ID_PATTERN.test(match.id)) {
                  const idx = updatedItems.findIndex(
                    i => i.id === legacyItem.id
                      && i.selectedSize === legacyItem.selectedSize
                      && i.selectedColor === legacyItem.selectedColor
                  );
                  if (idx >= 0) {
                    updatedItems[idx] = { ...updatedItems[idx], id: match.id };
                    migrated = true;
                  }
                } else {
                  // Product no longer exists — mark for removal
                  const idx = updatedItems.findIndex(
                    i => i.id === legacyItem.id
                      && i.selectedSize === legacyItem.selectedSize
                      && i.selectedColor === legacyItem.selectedColor
                  );
                  if (idx >= 0) {
                    updatedItems.splice(idx, 1);
                    migrated = true;
                  }
                }
              }

              if (migrated) {
                setItems(updatedItems);
              } else {
                setItems(parsed);
              }
            })
            .catch(() => {
              // If migration fetch fails, load the cart as-is (legacy items
              // will show "product not found" and the user can re-add them)
              setItems(parsed);
            });
        } else {
          setItems(parsed);
        }
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

  const addItem = useCallback((newItem: Omit<CartItem, "quantity"> & { maxPerOrder?: number; stockQuantity?: number | null; quantity?: number }): boolean => {
    const requestedQty = newItem.quantity || 1;
    let actuallyChanged = false;

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

        // If nothing would change, return same reference (no re-render)
        if (newQty === existing.quantity) {
          return prev;
        }

        actuallyChanged = true;
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty, maxPerOrder: newItem.maxPerOrder, stockQuantity: newItem.stockQuantity };
        return updated;
      }
      // Add as new item with requested quantity
      actuallyChanged = true;
      const tempItem = { ...newItem, quantity: requestedQty };
      const maxQty = getEffectiveMax(tempItem as CartItem);
      return [...prev, { ...newItem, quantity: Math.min(requestedQty, maxQty) }];
    });

    if (actuallyChanged) {
      setCartBounceKey(k => k + 1);
      setLastAddedInfo({ name: newItem.name, quantity: requestedQty, timestamp: Date.now() });
    }

    return actuallyChanged;
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
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, cartBounceKey, lastAddedInfo }}>
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