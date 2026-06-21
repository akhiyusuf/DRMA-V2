"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/types/product";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, X } from "lucide-react";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProducts(data);
      })
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredProducts = products.filter(product => {
    if (selectedTags.length === 0) return true;
    return selectedTags.some(tag => (product.tags as string[]).includes(tag));
  });

  return (
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground">
      
      {/* Editorial Header */}
      <section className="pt-32 pb-16 px-4 md:px-8 border-b border-foreground/5">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center gap-4 mb-6"
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
            className="text-5xl md:text-7xl lg:text-8xl font-heading font-light tracking-tight text-foreground leading-[0.9] max-w-4xl"
          >
            Curated <br/> <span className="italic font-light text-foreground/70">Essentials.</span>
          </motion.h1>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          
          {/* Filters Sidebar: Soft Structuralism */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-32">
              <h2 className="text-[10px] font-medium mb-8 uppercase tracking-[0.2em] text-foreground/50 border-b border-foreground/10 pb-4">Refine By Ethics</h2>
              
              <div className="space-y-4">
                {["Ethically Sourced", "Artisan Made", "Organic", "Hand-stitched"].map(tag => (
                  <motion.div 
                    key={tag} 
                    whileHover={{ x: 4 }}
                    className="flex items-center space-x-4 group"
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

              {selectedTags.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTags([])}
                  className="mt-12 flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </motion.button>
              )}
            </div>
          </aside>

          {/* Product Grid: Double Bezel Masonry */}
          <div className="flex-1">
            <motion.div 
              layout
              className="columns-1 sm:columns-2 xl:columns-3 gap-8 space-y-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, index) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, delay: index * 0.05, ease: [0.32, 0.72, 0, 1] }}
                    key={product.id}
                    className="group flex flex-col break-inside-avoid mb-8"
                  >
                    <Link href={`/product/${product.id}`} className="block relative w-full mb-6">
                      {/* Double Bezel Card */}
                      <div className="p-1.5 rounded-[1.5rem] bg-foreground/5 ring-1 ring-foreground/5 group-hover:ring-foreground/15 transition-all duration-500">
                        <div className="relative rounded-[calc(1.5rem-0.375rem)] overflow-hidden bg-foreground/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                          {product.images[0] ? (
                            <img 
                                src={product.images[0]} 
                                alt={product.name} 
                                className="w-full h-auto object-cover transition-transform duration-[1.5s] ease-[0.32,0.72,0,1] group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-[300px] bg-foreground/5 flex items-center justify-center text-foreground/40">No Image</div>
                          )}
                          
                          {/* Aesthetic Tags */}
                          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 z-10">
                            {product.tags.includes("Artisan Made") && (
                              <span className="backdrop-blur-md bg-background/80 text-foreground text-[9px] font-medium uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-sm">
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
                    <div className="flex justify-between items-start px-2">
                      <div>
                        <h3 className="font-heading font-normal text-xl text-foreground mb-1 group-hover:underline underline-offset-4 decoration-foreground/30 transition-all">{product.name}</h3>
                        <p className="text-foreground/50 text-sm font-light uppercase tracking-widest">${product.price.toFixed(2)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-foreground/10 flex items-center justify-center text-foreground/50 group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                        <ArrowUpRight className="w-3 h-3" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
            
            {filteredProducts.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-32 flex flex-col items-center justify-center text-center border border-dashed border-foreground/10 rounded-[2rem]"
              >
                <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
                  <X className="w-6 h-6 text-foreground/40" />
                </div>
                <h3 className="text-2xl font-heading font-light text-foreground mb-2">No Archives Found</h3>
                <p className="text-foreground/50 font-light max-w-sm">We couldn&apos;t find any pieces matching your exact ethical criteria.</p>
                <button 
                  onClick={() => setSelectedTags([])}
                  className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-foreground border-b border-foreground pb-1 hover:text-foreground/60 transition-colors"
                >
                  Reset Parameters
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
