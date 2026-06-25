"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";

/**
 * Prominent slide-in toast that appears at the top-right corner of the
 * viewport whenever an item is added to the cart. Reads `lastAddedInfo`
 * from CartContext (set by addItem) and auto-dismisses after 4 seconds.
 *
 * The small "Added" badge under the cart icon in the Navbar remains —
 * this toast is the more prominent, accessibility-friendly confirmation
 * that satisfies the "Add-to-Cart Feedback" requirement (immediate,
 * visible, in-UI — no browser alert/confirm).
 */
export function AddToCartToast() {
  const { lastAddedInfo, itemCount } = useCart();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Show toast whenever lastAddedInfo changes (i.e. a new item was added)
  useEffect(() => {
    if (!lastAddedInfo) return;

    // Reveal the toast
    setVisible(true);

    // Auto-hide after 4 seconds
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 4000);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [lastAddedInfo]);

  // Allow manual close
  const dismiss = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setVisible(false);
  };

  // Esc key dismisses the toast (a11y)
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-20 right-4 md:right-6 z-[80] pointer-events-none"
    >
      <AnimatePresence>
        {visible && lastAddedInfo && (
          <motion.div
            key={lastAddedInfo.timestamp}
            initial={{ opacity: 0, x: 40, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 40, y: -8 }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            role="status"
            className="pointer-events-auto w-[calc(100vw-2rem)] sm:w-80 max-w-sm rounded-2xl bg-background border border-foreground/10 shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden"
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-foreground" />
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Success icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-4 w-4 stroke-[2.5]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-foreground/50 mb-1">
                    Added to Cart
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {lastAddedInfo.quantity > 1
                      ? `${lastAddedInfo.quantity}× ${lastAddedInfo.name}`
                      : lastAddedInfo.name}
                  </p>
                  <p className="text-[10px] text-foreground/40 mt-1 tracking-widest uppercase">
                    {itemCount} {itemCount === 1 ? "item" : "items"} in cart
                  </p>
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Dismiss notification"
                  className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-full text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* CTA: View Cart */}
              <Link
                href="/cart"
                onClick={dismiss}
                className="mt-4 group relative w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background pl-4 pr-2 py-1.5 text-xs font-medium tracking-wide transition-all active:scale-[0.98] hover:bg-foreground/90"
              >
                <span className="uppercase tracking-widest py-1.5 flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  View Cart
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/20 transition-transform duration-300 ease-spring group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
