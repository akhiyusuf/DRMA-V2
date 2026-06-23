"use client";

import { notFound } from "next/navigation";
import { use, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Info, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { DEFAULT_MAX_PER_ORDER } from "@/types/product";
import { useCart } from "@/context/CartContext";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
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
  const initSound = useCallback(() => {
    if (!soundRef.current) {
      soundRef.current = new Audio('/sounds/add-to-cart.wav');
      soundRef.current.volume = 0.3;
    }
  }, []);

  const playCartSound = useCallback(() => {
    initSound();
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(() => {});
    }
  }, [initSound]);

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
    <div className="min-h-screen pt-32 container mx-auto px-6">
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

  // --- Derived values (after early returns, no hooks below) ---
  const maxPerOrder = product.max_per_order ?? DEFAULT_MAX_PER_ORDER;
  const productStockTracked = product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity >= 0;

  // Use variant stock if available, fall back to product-level stock
  const effectiveStock = variantStock !== null ? variantStock : (productStockTracked ? product.stock_quantity! : -1);
  const stockTracked = effectiveStock >= 0;
  const isOutOfStock = effectiveStock === 0;
  const isLowStock = stockTracked && effectiveStock > 0 && effectiveStock <= (product.low_stock_threshold ?? 3);
  const effectiveMax = stockTracked ? Math.min(maxPerOrder, effectiveStock) : maxPerOrder;

  // Reset quantity if it exceeds the new effective max
  useEffect(() => {
    if (quantity > effectiveMax) setQuantity(effectiveMax);
  }, [effectiveMax, quantity]);

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
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        
        {/* Breadcrumb / Back */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="mb-12"
        >
          <Link href="/shop" className="group inline-flex items-center text-xs uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground/5 mr-3 transition-transform group-hover:-translate-x-1">
              <ArrowLeft className="w-3 h-3" />
            </span>
            Back to Archive
          </Link>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          {/* Product Image: Double Bezel Presentation */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-32 mb-8 lg:mb-0">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
              className="p-2 rounded-[2.5rem] bg-foreground/5 ring-1 ring-foreground/10"
            >
              <div className="aspect-[3/4] relative rounded-[calc(2.5rem-0.5rem)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
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
          <div className="w-full lg:w-1/2 flex flex-col pt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="mb-6 flex flex-wrap gap-2">
                {product.tags.map(tag => (
                  <span key={tag} className="bg-foreground/5 text-foreground/70 text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-foreground/10">
                    {tag}
                  </span>
                ))}
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-light mb-4 leading-[0.9] tracking-tight">{product.name}</h1>
              <p className="text-2xl font-light text-foreground/60 mb-10 tracking-widest">${product.price.toFixed(2)}</p>
              
              <div className="w-full h-px bg-foreground/10 mb-10"></div>
              
              <p className="text-foreground/70 leading-relaxed font-light text-lg mb-12 max-w-xl">
                {product.description}
              </p>

              {/* Sizes Selection */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">Size</h3>
                  <button className="text-[10px] uppercase tracking-widest text-foreground/40 hover:text-foreground underline underline-offset-4 transition-colors">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.variations?.sizes?.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)} className={`w-14 h-14 rounded-full border border-foreground/10 flex items-center justify-center text-sm font-light hover:border-foreground hover:bg-foreground/5 transition-all focus:ring-1 focus:ring-foreground focus:outline-none ${selectedSize === size ? 'bg-foreground text-background' : ''}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors Selection */}
              <div className="mb-10">
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 mb-4">Color</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variations?.colors?.map(color => (
                    <button key={color} onClick={() => setSelectedColor(color)} className={`px-6 h-12 rounded-full border border-foreground/10 flex items-center justify-center text-sm font-light hover:border-foreground hover:bg-foreground/5 transition-all focus:ring-1 focus:ring-foreground focus:outline-none ${selectedColor === color ? 'bg-foreground text-background' : ''}`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-10">
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 mb-4">Quantity</h3>
                <div className="inline-flex items-center gap-0 border border-foreground/10 rounded-full">
                  <button
                    onClick={decrementQty}
                    disabled={quantity <= 1}
                    className="w-12 h-12 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all rounded-l-full disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center text-sm font-light tabular-nums">{quantity}</span>
                  <button
                    onClick={incrementQty}
                    disabled={quantity >= effectiveMax}
                    className="w-12 h-12 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all rounded-r-full disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
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
                  className={`text-sm px-5 py-3 rounded-xl mb-6 flex items-center gap-2 ${
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