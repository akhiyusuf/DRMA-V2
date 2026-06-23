"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/types/product";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, X, SlidersHorizontal } from "lucide-react";

function FilterContent({ 
  categories, 
  selectedCategory, 
  setSelectedCategory, 
  selectedTags, 
  toggleTag, 
  setSelectedTags,
  onDone 
}: { 
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  selectedTags: string[];
  toggleTag: (t: string) => void;
  setSelectedTags: (t: string[]) => void;
  onDone?: () => void;
}) {
  const activeFilterCount = (selectedCategory ? 1 : 0) + selectedTags.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-foreground/10 mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-foreground/60" />
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-foreground">
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] bg-foreground text-background text-[10px] font-semibold rounded-full flex items-center justify-center px-1 leading-none">
              {activeFilterCount}
            </span>
          )}
        </div>
        {onDone && (
          <button
            onClick={onDone}
            className="lg:hidden p-1.5 rounded-full hover:bg-foreground/5 transition-colors"
            aria-label="Close filters"
          >
            <X className="w-4 h-4 text-foreground/60" />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain -mx-1 px-1">
        <h3 className="text-[10px] font-medium mb-4 uppercase tracking-[0.2em] text-foreground/50 border-b border-foreground/10 pb-3">
          Category
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setSelectedCategory(null)} className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${!selectedCategory ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-foreground/60 hover:border-foreground/30'}`}>All</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${selectedCategory === cat ? 'bg-foreground text-background border-foreground' : 'border-foreground/10 text-foreground/60 hover:border-foreground/30'}`}>{cat}</button>
          ))}
        </div>

        <h3 className="text-[10px] font-medium mb-4 uppercase tracking-[0.2em] text-foreground/50 border-b border-foreground/10 pb-3">
          Refine By Ethics
        </h3>
        
        <div className="space-y-3.5">
          {["Ethically Sourced", "Artisan Made", "Organic", "Hand-stitched"].map(tag => (
            <motion.div 
              key={tag} 
              whileHover={{ x: 4 }}
              className="flex items-center space-x-3 group"
            >
              <Checkbox 
                id={`tag-${tag}`} 
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
                className="rounded-full w-5 h-5 border-foreground/20 data-[state=checked]:bg-foreground data-[state=checked]:text-background transition-all"
              />
              <Label 
                htmlFor={`tag-${tag}`} 
                className="text-sm font-light text-foreground/70 cursor-pointer group-hover:text-foreground transition-colors uppercase tracking-wider"
              >
                {tag}
              </Label>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Clear + Done */}
      <div className="pt-4 mt-4 border-t border-foreground/10 flex items-center justify-between">
        {activeFilterCount > 0 ? (
          <button
            onClick={() => { setSelectedCategory(null); setSelectedTags([]); }}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        ) : (
          <div />
        )}
        {onDone && (
          <button
            onClick={onDone}
            className="text-xs font-medium uppercase tracking-widest bg-foreground text-background px-5 py-2.5 rounded-full transition-colors hover:bg-foreground/90"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (filtersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [filtersOpen]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProducts(data);
        setFetching(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setFetching(false);
      });
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const activeFilterCount = (selectedCategory ? 1 : 0) + selectedTags.length;

  const filteredProducts = products.filter(product => {
    if (selectedCategory && product.category !== selectedCategory) return false;
    if (selectedTags.length === 0) return true;
    return selectedTags.some(tag => (product.tags as string[]).includes(tag));
  });

  return (
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground">
      
      {/* Editorial Header */}
      <section className="pt-24 md:pt-32 pb-6 md:pb-10 px-4 md:px-8 border-b border-foreground/5">
        <div className="container mx-auto flex items-end justify-between gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
              className="flex items-center gap-3 mb-3 md:mb-4"
            >
              <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70 border border-foreground/10">
                The Archive
              </span>
              <span className="text-xs font-medium tracking-widest text-foreground/40 uppercase">
                {filteredProducts.length} Pieces
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.2, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
              className="text-4xl md:text-6xl lg:text-8xl font-heading font-light tracking-tight text-foreground leading-[0.9] max-w-4xl"
            >
              Curated <br/> <span className="italic font-light text-foreground/70">Essentials.</span>
            </motion.h1>
          </div>

          {/* Mobile filter toggle button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full border border-foreground/10 bg-background text-xs uppercase tracking-widest text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors shrink-0 mb-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-[16px] h-[16px] bg-foreground text-background text-[9px] font-semibold rounded-full flex items-center justify-center px-1 leading-none">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </section>

      {/* Desktop: Sidebar + Grid layout */}
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 lg:py-16">
        <div className="flex gap-6 md:gap-8 lg:gap-24">
          
          {/* Desktop Filters Sidebar: pinned left */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="sticky top-28">
              <FilterContent
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedTags={selectedTags}
                toggleTag={toggleTag}
                setSelectedTags={setSelectedTags}
              />
            </div>
          </aside>

          {/* Product Grid: Pinterest Masonry */}
          <div className="flex-1 min-w-0">
            {fetching && products.length === 0 ? (
              <div className="columns-2 sm:columns-2 md:columns-3 xl:columns-3 gap-3 md:gap-4 lg:gap-6 space-y-3 md:space-y-4 lg:space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid mb-3 md:mb-4 lg:mb-6 animate-pulse">
                    <div className="p-1 md:p-1.5 rounded-xl md:rounded-[1.5rem] bg-foreground/5 ring-1 ring-foreground/5">
                      <div className="rounded-[0.65rem] md:rounded-[calc(1.5rem-0.375rem)] bg-foreground/5 aspect-[3/4]" />
                    </div>
                    <div className="px-1.5 md:px-2 mt-3 md:mt-4 space-y-2">
                      <div className="h-4 w-28 md:h-5 md:w-32 bg-foreground/10 rounded" />
                      <div className="h-3 w-14 md:h-4 md:w-16 bg-foreground/10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <motion.div 
              layout
              className="columns-2 sm:columns-2 md:columns-3 xl:columns-3 gap-3 md:gap-4 lg:gap-6 space-y-3 md:space-y-4 lg:space-y-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.97, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.4, delay: index * 0.04, ease: [0.32, 0.72, 0, 1] }}
                    key={product.id}
                    className="group flex flex-col break-inside-avoid mb-3 md:mb-4 lg:mb-6"
                  >
                    <Link href={`/product/${product.id}`} className="block relative w-full mb-2.5 md:mb-4">
                      {/* Double Bezel Card */}
                      <div className="p-1 md:p-1.5 rounded-xl md:rounded-[1.5rem] bg-foreground/5 ring-1 ring-foreground/5 group-hover:ring-foreground/15 transition-all duration-500">
                        <div className="relative rounded-[0.65rem] md:rounded-[calc(1.5rem-0.375rem)] overflow-hidden bg-foreground/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                          {product.images[0] ? (
                            <img 
                                src={product.images[0]} 
                                alt={product.name} 
                                className="w-full h-auto object-cover transition-transform duration-[1.5s] ease-[0.32,0.72,0,1] group-hover:scale-105"
                                loading="lazy"
                            />
                          ) : (
                            <div className="w-full aspect-[3/4] bg-foreground/5 flex items-center justify-center text-foreground/40">No Image</div>
                          )}
                          
                          {/* Aesthetic Tags */}
                          <div className="absolute bottom-2.5 left-2.5 md:bottom-4 md:left-4 flex flex-wrap gap-1.5 md:gap-2 z-10">
                            {product.tags.includes("Artisan Made") && (
                              <span className="backdrop-blur-md bg-background/80 text-foreground text-[8px] md:text-[9px] font-medium uppercase tracking-[0.2em] px-2 md:px-3 py-1 md:py-1.5 rounded-full shadow-sm">
                                Artisan
                              </span>
                            )}
                          </div>

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500"></div>
                        </div>
                      </div>
                    </Link>

                    {/* Typography */}
                    <div className="flex justify-between items-start px-1.5 md:px-2">
                      <div className="min-w-0">
                        <h3 className="font-heading font-normal text-sm md:text-lg lg:text-xl text-foreground mb-0.5 md:mb-1 group-hover:underline underline-offset-4 decoration-foreground/30 transition-all truncate">{product.name}</h3>
                        <p className="text-foreground/50 text-[11px] md:text-xs lg:text-sm font-light uppercase tracking-widest">${product.price.toFixed(2)}</p>
                      </div>
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-foreground/10 flex items-center justify-center text-foreground/50 group-hover:bg-foreground group-hover:text-background transition-all duration-300 shrink-0 ml-2">
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            )}
            
            {!fetching && filteredProducts.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 md:py-32 flex flex-col items-center justify-center text-center border border-dashed border-foreground/10 rounded-[2rem]"
              >
                <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
                  <X className="w-6 h-6 text-foreground/40" />
                </div>
                <h3 className="text-2xl font-heading font-light text-foreground mb-2">No Archives Found</h3>
                <p className="text-foreground/50 font-light max-w-sm">We couldn&apos;t find any pieces matching your exact ethical criteria.</p>
                <button 
                  onClick={() => { setSelectedTags([]); setSelectedCategory(null); }}
                  className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-foreground border-b border-foreground pb-1 hover:text-foreground/60 transition-colors"
                >
                  Reset Parameters
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[70] lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
            {/* Drawer panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[340px] bg-background z-[71] lg:hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 pt-6 flex-1 overflow-hidden">
                <FilterContent
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedTags={selectedTags}
                  toggleTag={toggleTag}
                  setSelectedTags={setSelectedTags}
                  onDone={() => setFiltersOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}