"use client";

import { notFound } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Info, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { DEFAULT_MAX_PER_ORDER } from "@/types/product";
import { useCart } from "@/context/CartContext";

/**
 * Client view for a single product. Receives the resolved `id` as a prop
 * from the server-component page wrapper. The wrapper (page.tsx) owns the
 * `generateMetadata` export that produces the per-product <title>.
 */
export default function ProductView({ id }: { id: string }) {
  const resolvedParams = { id };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [variantStock, setVariantStock] = useState<number | null>(null);
  const { addItem } = useCart();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ALL hooks must be declared before any early returns (Rules of Hooks)
  const playCartSound = () => {
    if (!soundRef.current) {
      soundRef.current = new Audio('/sounds/add-to-cart.wav');
      soundRef.current.volume = 0.3;
    }
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((data: Product[]) => {
        const found = data.find(p => p.id === resolvedParams.id);
        setProduct(found || null);
        setLoading(false);
      })
      .catch(() => {
        setProduct(null);
        setLoading(false);
      });
  }, [resolvedParams.id]);

  // Default Variant Selection: pre-select the first AVAILABLE size+color
  // combination on page load so the "Add to Cart" button is active
  // immediately instead of showing "Select Options".
  //
  // Strategy:
  //   1. Optimistically pick the first size + first color as soon as the
  //      product is loaded (gives the user an active button in one tick).
  //   2. In parallel, fetch all variant stock rows for this product and,
  //      if the optimistic combination happens to be out of stock, swap
  //      to the first combination that has stock > 0.
  useEffect(() => {
    if (!product) return;
    const sizes = product.variations?.sizes ?? [];
    const colors = product.variations?.colors ?? [];
    if (sizes.length === 0 || colors.length === 0) return;

    // (1) Optimistic pre-selection
    setSelectedSize(prev => prev ?? sizes[0]);
    setSelectedColor(prev => prev ?? colors[0]);

    // (2) Smart pre-selection: pick first in-stock combination
    let cancelled = false;
    fetch('/api/cms/stock/variant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    })
      .then(res => res.ok ? res.json() : { variants: [] })
      .then((data: { variants?: Array<{ size: string; color: string; stock_quantity: number }> }) => {
        if (cancelled) return;
        const variants = data?.variants ?? [];
        if (variants.length === 0) return;

        // Build a lookup of stock by `${size}|${color}`
        const stockMap = new Map<string, number>();
        for (const v of variants) {
          stockMap.set(`${v.size}|${v.color}`, v.stock_quantity);
        }

        // Check if the optimistic selection is out of stock
        const optimisticKey = `${sizes[0]}|${colors[0]}`;
        const optimisticStock = stockMap.get(optimisticKey);
        if (optimisticStock !== undefined && optimisticStock > 0) {
          // Optimistic pick is fine — nothing to change.
          return;
        }

        // Otherwise: find the first combination with stock > 0
        // Iterate sizes outer, colors inner — matches the visual order on the page.
        for (const size of sizes) {
          for (const color of colors) {
            const stock = stockMap.get(`${size}|${color}`);
            if (stock !== undefined && stock > 0) {
              setSelectedSize(size);
              setSelectedColor(color);
              return;
            }
          }
        }
      })
      .catch(() => {
        // Silently ignore — the optimistic selection already gives the user
        // an active "Add to Cart" button, and the existing per-variant
        // stock fetch will surface "Out of Stock" if needed.
      });

    return () => { cancelled = true; };
  }, [product]);

  // Fetch variant stock when product + selections are available
  useEffect(() => {
    if (!product || !selectedSize || !selectedColor) {
      setVariantStock(null);
      return;
    }
    fetch(`/api/cms/stock/variant?productId=${product.id}&size=${encodeURIComponent(selectedSize)}&color=${encodeURIComponent(selectedColor)}`)
      .then(res => res.ok ? res.json() : { stock: null })
      .then(data => setVariantStock(data.stock ?? null))
      .catch(() => setVariantStock(null));
  }, [product, selectedSize, selectedColor]);

  // Cleanup feedback timer on unmount
  useEffect(() => () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); }, []);

  // --- Loading skeleton (early return #1) ---
  if (loading) return (
    <div className="min-h-screen pt-24 md:pt-32 container mx-auto px-4 md:px-6">
      <div className="animate-pulse space-y-8">
        <div className="h-4 w-24 bg-foreground/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-foreground/5 rounded-3xl" />
          <div className="space-y-6">
            <div className="h-8 w-48 bg-foreground/10 rounded" />
            <div className="h-6 w-24 bg-foreground/10 rounded" />
            <div className="h-32 bg-foreground/5 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );

  // --- 404 (early return #2) ---
  if (!product) {
    notFound();
  }

  // Reset quantity if it exceeds the new effective max
  const maxPerOrder = product.max_per_order ?? DEFAULT_MAX_PER_ORDER;
  const productStockTracked = product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity >= 0;

  // Use variant stock if available, fall back to product-level stock
  const effectiveStock = variantStock !== null ? variantStock : (productStockTracked ? product.stock_quantity! : -1);
  const stockTracked = effectiveStock >= 0;
  const isOutOfStock = effectiveStock === 0;
  const isLowStock = stockTracked && effectiveStock > 0 && effectiveStock <= (product.low_stock_threshold ?? 3);
  const effectiveMax = stockTracked ? Math.min(maxPerOrder, effectiveStock) : maxPerOrder;

  const showFeedback = (type: 'error' | 'success', message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ type, message });
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 3000);
  };

  const addToCart = () => {
    if (!selectedSize || !selectedColor) {
      showFeedback('error', 'Please select both a size and a color.');
      return;
    }

    if (isOutOfStock) {
      showFeedback('error', 'This combination is currently out of stock.');
      return;
    }

    const success = addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || "",
      selectedSize,
      selectedColor,
      maxPerOrder,
      stockQuantity: effectiveStock === -1 ? null : effectiveStock,
      quantity,
    });

    if (success) {
      playCartSound();
      setPulseKey(k => k + 1);
      showFeedback('success', `${quantity}x ${product.name} (${selectedSize}, ${selectedColor}) added to cart!`);
    } else {
      showFeedback('error', `Maximum ${effectiveMax} per order reached for this item.`);
    }
  };

  const incrementQty = () => setQuantity(prev => Math.min(prev + 1, effectiveMax));
  const decrementQty = () => setQuantity(prev => Math.max(prev - 1, 1));

  return (
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground pt-24 md:pt-32 pb-16 md:pb-24">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        
        {/* Breadcrumb / Back */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="mb-6 md:mb-10"
        >
          <Link href="/shop" className="group inline-flex items-center text-xs uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground/5 mr-3 transition-transform group-hover:-translate-x-1">
              <ArrowLeft className="w-3 h-3" />
            </span>
            Back to Archive
          </Link>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 md:gap-12 lg:gap-24 items-start">
          
          {/* Product Image: Double Bezel Presentation */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-28 mb-4 lg:mb-0">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
              className="p-1.5 md:p-2 rounded-[1.5rem] md:rounded-[2.5rem] bg-foreground/5 ring-1 ring-foreground/10"
            >
              <div className="aspect-[3/4] relative rounded-[calc(1.5rem-0.375rem)] md:rounded-[calc(2.5rem-0.5rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                {product.images[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-[2s] hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-foreground/5 flex items-center justify-center text-foreground/40">No Image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none"></div>
              </div>
            </motion.div>
          </div>

          {/* Product Info: Editorial Layout */}
          <div className="w-full lg:w-1/2 flex flex-col pt-2 md:pt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="mb-4 md:mb-6 flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="bg-foreground/5 text-foreground/70 text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-foreground/10">
                    {tag}
                  </span>
                ))}
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-light mb-3 md:mb-4 leading-[0.9] tracking-tight">{product.name}</h1>
              <p className="text-xl md:text-2xl font-light text-foreground/60 mb-6 md:mb-10 tracking-widest">${product.price.toFixed(2)}</p>
              
              <div className="w-full h-px bg-foreground/10 mb-6 md:mb-10"></div>
              
              <p className="text-foreground/70 leading-relaxed font-light text-base md:text-lg mb-8 md:mb-12 max-w-xl">
                {product.description}
              </p>

              {/* Sizes Selection */}
              <div className="mb-6 md:mb-10">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">Size</h3>
                  <button className="text-[10px] uppercase tracking-widest text-foreground/40 hover:text-foreground underline underline-offset-4 transition-colors">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {product.variations?.sizes?.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)} className={`w-12 h-12 md:w-14 md:h-14 rounded-full border border-foreground/10 flex items-center justify-center text-sm font-light hover:border-foreground hover:bg-foreground/5 transition-all focus:ring-1 focus:ring-foreground focus:outline-none ${selectedSize === size ? 'bg-foreground text-background' : ''}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors Selection */}
              <div className="mb-6 md:mb-10">
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 mb-3 md:mb-4">Color</h3>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {product.variations?.colors?.map(color => (
                    <button key={color} onClick={() => setSelectedColor(color)} className={`px-5 md:px-6 h-10 md:h-12 rounded-full border border-foreground/10 flex items-center justify-center text-sm font-light hover:border-foreground hover:bg-foreground/5 transition-all focus:ring-1 focus:ring-foreground focus:outline-none ${selectedColor === color ? 'bg-foreground text-background' : ''}`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6 md:mb-10">
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 mb-3 md:mb-4">Quantity</h3>
                <div className="inline-flex items-center gap-0 border border-foreground/10 rounded-full">
                  <button
                    onClick={decrementQty}
                    disabled={quantity <= 1}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all rounded-l-full disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <span className="w-12 md:w-14 text-center text-sm font-light tabular-nums">{quantity}</span>
                  <button
                    onClick={incrementQty}
                    disabled={quantity >= effectiveMax}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all rounded-r-full disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
                {stockTracked && (
                  <p className="text-[10px] uppercase tracking-widest text-foreground/30 mt-2">Max {effectiveMax} per order</p>
                )}
              </div>

              {/* Inline Feedback */}
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm px-4 py-2.5 md:px-5 md:py-3 rounded-xl mb-4 md:mb-6 flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {feedback.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
                  {feedback.message}
                </motion.div>
              )}

              {/* Stock Status — exact quantities hidden from customers */}
              {selectedSize && selectedColor && (
                <div className="mb-6 space-y-1">
                  {isOutOfStock ? (
                    <p className="text-xs uppercase tracking-widest text-red-500 font-medium">Out of Stock</p>
                  ) : isLowStock ? (
                    <p className="text-xs uppercase tracking-widest text-amber-600 font-medium">Low Stock — order soon</p>
                  ) : stockTracked ? (
                    <p className="text-xs uppercase tracking-widest text-foreground/40">In Stock</p>
                  ) : null}
                </div>
              )}

              {/* Add to Cart Button + Pulse Effect */}
              <div className="relative mb-6">
                {/* Subtle pulse glow under the button */}
                <div className="absolute inset-x-0 -bottom-4 h-8 flex items-start justify-center pointer-events-none overflow-visible">
                  <motion.div
                    key={pulseKey}
                    initial={{ opacity: 0.4, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.4 }}
                    transition={{ duration: 1.2, ease: "easeOut" as const }}
                    className="w-24 h-3 rounded-full bg-primary/15 blur-sm"
                  />
                </div>

                <button 
                  ref={buttonRef}
                  onClick={addToCart} 
                  disabled={isOutOfStock}
                  className={`group relative w-full inline-flex items-center justify-center gap-4 rounded-full pl-8 pr-2 py-2 text-sm font-medium tracking-wide transition-all active:scale-[0.98] ${
                    isOutOfStock
                      ? 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
                >
                  <span className="uppercase tracking-widest text-xs py-3">
                    {!selectedSize || !selectedColor ? 'Select Options' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                  </span>
                  {!isOutOfStock && (selectedSize && selectedColor) && (
                    <div className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 transition-transform duration-300 ease-spring group-hover:scale-105">
                      <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
                    </div>
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-center text-[10px] uppercase tracking-[0.1em] text-foreground/40 gap-4">
                <span className="flex items-center"><Info className="w-3 h-3 mr-1.5" /> Free Global Shipping over $150</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Ethical Returns</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}