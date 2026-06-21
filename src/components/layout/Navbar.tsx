"use client";

import Link from "next/link";
import { ShoppingBag, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-4 inset-x-0 mx-auto z-[60] w-[95%] md:w-[90%] max-w-7xl transition-all duration-500 ${
          scrolled || mobileMenuOpen
            ? "bg-background border border-border/50 shadow-sm"
            : "bg-background/0 backdrop-blur-none border-none shadow-none"
        } ${mobileMenuOpen ? "rounded-[2rem]" : "rounded-full"}`}
      >
        <div className="container mx-auto px-4 md:px-10 h-16 flex items-center justify-between">
          {/* Left: Mobile Menu Toggle / Desktop Links */}
          <div className="flex-1 flex items-center gap-4">
             <button 
               className="md:hidden p-2 hover:text-primary transition-colors z-50" 
               onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
               aria-label="Toggle Menu"
             >
               {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
             </button>
             
             <nav className="hidden md:flex items-center gap-12">
              <Link href="/shop" className="text-[11px] font-medium tracking-[0.25em] hover:text-primary transition-colors uppercase">
                Shop
              </Link>
              <Link href="/ethics" className="text-[11px] font-medium tracking-[0.25em] hover:text-primary transition-colors uppercase">
                Mission
              </Link>
            </nav>
          </div>
          
          <Link href="/" className="text-xl md:text-2xl font-heading font-light tracking-[0.3em] text-primary text-center flex-1">
            DRMA
          </Link>
          
          <div className="flex-1 flex items-center justify-end gap-2 md:gap-8">
            <Link href="/about" className="hidden md:block text-[11px] font-medium tracking-[0.25em] hover:text-primary transition-colors uppercase">
              About
            </Link>
            <button className="p-2 hover:text-primary transition-colors relative" onClick={() => alert("Account functionality coming soon")} aria-label="User Account">
              <User className="w-5 h-5 stroke-[1.5]" />
            </button>
            <Link href="/cart" className="p-2 hover:text-primary transition-colors relative" aria-label="Shopping Cart">
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full"></span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu Content */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="md:hidden overflow-hidden"
            >
              <div className="flex flex-col items-center py-12 gap-8 border-t border-border/20 mx-6">
                {[
                  { name: "Shop", href: "/shop" },
                  { name: "Our Mission", href: "/ethics" },
                  { name: "About", href: "/about" }
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-2xl font-heading font-light tracking-widest text-foreground hover:text-primary transition-colors uppercase"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: (scrolled || mobileMenuOpen) ? 0 : 1 }}
        className="fixed top-20 left-0 w-full border-b-2 border-border/50 z-[59] transition-opacity duration-200"
      />
    </>
  );
}
