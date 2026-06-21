"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Trash2, ArrowUpRight, ShieldCheck, Truck } from "lucide-react";
import type { Product } from "@/types/product";

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setProducts(data);
          if (data.length >= 5) {
            setCartItems([
              { ...data[0], quantity: 1, selectedSize: "M", selectedColor: "Sand" },
              { ...data[4], quantity: 1, selectedSize: "One Size", selectedColor: "Beige" }
            ]);
          }
        }
      })
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col mb-16 border-b border-foreground/5 pb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70 border border-foreground/10">
              The Vault
            </span>
            <span className="text-xs font-medium tracking-widest text-foreground/40 uppercase">
              {cartItems.length} Pieces
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-heading font-light tracking-tight">Your <span className="italic text-foreground/60">Cart.</span></h1>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          {/* Cart Items */}
          <div className="w-full lg:w-2/3">
            <div className="space-y-8">
              {cartItems.map((item, index) => (
                <motion.div 
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                  className="flex flex-col sm:flex-row gap-8 pb-8 border-b border-foreground/5 group"
                >
                  {/* Double Bezel Thumbnail */}
                  <Link href={`/product/${item.id}`} className="block flex-shrink-0 w-32 md:w-40">
                    <div className="p-1 rounded-2xl bg-foreground/5 ring-1 ring-foreground/10 transition-all duration-300 group-hover:ring-foreground/20">
                      <div className="aspect-[3/4] rounded-[calc(1rem-0.25rem)] overflow-hidden relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                         <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      </div>
                    </div>
                  </Link>
                  
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/product/${item.id}`} className="font-heading text-xl md:text-2xl hover:underline underline-offset-4 decoration-foreground/30 transition-all">
                          {item.name}
                        </Link>
                        <p className="font-light text-lg tracking-widest">${item.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex gap-4 mt-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-foreground/60 bg-foreground/5 px-3 py-1 rounded-full border border-foreground/10">
                          {item.selectedSize}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-foreground/60 bg-foreground/5 px-3 py-1 rounded-full border border-foreground/10">
                          {item.selectedColor}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-8">
                      {/* Fluid Quantity Selector */}
                      <div className="flex items-center rounded-full border border-foreground/10 bg-foreground/5 overflow-hidden p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-background transition-all">-</button>
                        <span className="w-8 text-center text-sm font-light">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-background transition-all">+</button>
                      </div>
                      
                      <button onClick={() => removeItem(item.id)} className="group/btn flex items-center text-[10px] uppercase tracking-[0.2em] font-medium text-foreground/40 hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3 mr-2 transition-transform group-hover/btn:scale-110" />
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Order Summary: Editorial Card */}
          <div className="w-full lg:w-1/3">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: [0.32, 0.72, 0, 1] }}
              className="sticky top-32"
            >
              <div className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10">
                <div className="rounded-[calc(2rem-0.375rem)] bg-background p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] mb-8 text-foreground/50 border-b border-foreground/10 pb-4">Order Summary</h2>
                  
                  <div className="space-y-4 font-light text-sm mb-8">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Subtotal</span>
                      <span className="tracking-widest">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70 flex items-center">Shipping <Truck className="w-3 h-3 ml-2 text-foreground/40" /></span>
                      <span className="text-foreground/40 italic">Calculated next</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Taxes</span>
                      <span className="text-foreground/40 italic">Calculated next</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between font-heading text-2xl mb-10 pt-6 border-t border-foreground/10">
                    <span className="font-light">Estimated Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Fluid Button */}
                  <Link 
                    href="/checkout" 
                    className="group relative w-full inline-flex items-center justify-center gap-4 rounded-full bg-foreground pl-8 pr-2 py-2 text-sm font-medium tracking-wide text-background transition-all active:scale-[0.98] hover:bg-foreground/90"
                  >
                    <span className="uppercase tracking-widest text-xs py-3">Secure Checkout</span>
                    <div className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 transition-transform duration-300 ease-spring group-hover:scale-105">
                      <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
                    </div>
                  </Link>
                  
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40 flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-2" />
                      Encrypted Payment
                    </p>
                    <div className="flex gap-2 opacity-50 grayscale">
                      {/* Icons would go here */}
                      <span className="text-xs font-bold border rounded px-2 py-0.5">VISA</span>
                      <span className="text-xs font-bold border rounded px-2 py-0.5">MC</span>
                      <span className="text-xs font-bold border rounded px-2 py-0.5">AMEX</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
