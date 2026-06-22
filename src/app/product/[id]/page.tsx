"use client";

import { notFound } from "next/navigation";
import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Info, Check } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const { addItem } = useCart();

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

  if (!product) {
    notFound();
  }

  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = product.stock_quantity != null && product.stock_quantity > 0 && product.stock_quantity !== -1 && product.stock_quantity <= (product.low_stock_threshold ?? 5);
  const stockIsTracked = product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity >= 0;

  const addToCart = () => {
    if (!selectedSize || !selectedColor) {
      setFeedback({ type: 'error', message: 'Please select both a size and a color.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    if (isOutOfStock) {
      setFeedback({ type: 'error', message: 'This item is currently out of stock.' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || "",
      selectedSize,
      selectedColor,
    });

    setFeedback({ type: 'success', message: `${product.name} (${selectedSize}, ${selectedColor}) added to cart!` });
    setTimeout(() => setFeedback(null), 3000);
  };

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
              <div className="mb-16">
                <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50 mb-4">Color</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variations?.colors?.map(color => (
                    <button key={color} onClick={() => setSelectedColor(color)} className={`px-6 h-12 rounded-full border border-foreground/10 flex items-center justify-center text-sm font-light hover:border-foreground hover:bg-foreground/5 transition-all focus:ring-1 focus:ring-foreground focus:outline-none ${selectedColor === color ? 'bg-foreground text-background' : ''}`}>
                      {color}
                    </button>
                  ))}
                </div>
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

              {/* Stock Status */}
              {stockIsTracked && (
                <div className="mb-6">
                  {isOutOfStock ? (
                    <p className="text-xs uppercase tracking-widest text-red-500 font-medium">Out of Stock</p>
                  ) : isLowStock ? (
                    <p className="text-xs uppercase tracking-widest text-amber-600 font-medium">Only {product.stock_quantity} left</p>
                  ) : (
                    <p className="text-xs uppercase tracking-widest text-foreground/40">In Stock ({product.stock_quantity} available)</p>
                  )}
                </div>
              )}

              {/* Add to Cart Button */}
              <button 
                onClick={addToCart} 
                disabled={isOutOfStock}
                className={`group relative w-full inline-flex items-center justify-center gap-4 rounded-full pl-8 pr-2 py-2 text-sm font-medium tracking-wide transition-all active:scale-[0.98] mb-6 ${
                  isOutOfStock
                    ? 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                <span className="uppercase tracking-widest text-xs py-3">
                  {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                </span>
                {!isOutOfStock && (
                  <div className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 transition-transform duration-300 ease-spring group-hover:scale-105">
                    <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
                  </div>
                )}
              </button>
              
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