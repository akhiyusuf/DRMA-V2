"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "@/types/product";
import { PillButton } from "@/components/brand/PillButton";
import { SectionLabel } from "@/components/brand/SectionLabel";

interface Props {
  /** Optional heading override. Defaults to "Continue Your Journey." */
  heading?: string;
  /** Optional subheading override. */
  subheading?: string;
  /** Number of products to show. Defaults to 3. */
  limit?: number;
  /** Visual variant — "light" for cream/white pages, "dark" for footer-style dark sections. */
  variant?: "light" | "dark";
  /** Product ID to exclude (e.g. the product currently being viewed). */
  excludeId?: string;
}

/**
 * End-of-page conversion CTA + product recommendation grid.
 * Pulls the latest in-stock products from /api/products and renders a
 * "Shop Now" section so content pages (About, Ethics) are never
 * conversion dead-ends.
 */
export function ProductRecommendations({
  heading = "Continue Your Journey.",
  subheading = "Carry the mission forward — explore pieces crafted with the same integrity you just read about.",
  limit = 3,
  variant = "light",
  excludeId,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) {
          const candidates = data.filter(p => p.id !== excludeId);
          // Prefer in-stock items, take first `limit`. The API returns
          // snake_case fields: `in_stock` (merchandising flag) and
          // `stock_quantity` (0 = sold out, -1/null = untracked).
          const inStock = candidates
            .filter((p: Product & { in_stock?: boolean }) => p.in_stock !== false && p.stock_quantity !== 0)
            .slice(0, limit);
          setProducts(inStock.length > 0 ? inStock : candidates.slice(0, limit));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [limit, excludeId]);

  const isDark = variant === "dark";
  const surfaceBg = isDark ? "bg-background/5" : "bg-foreground/5";
  const cardBg = isDark ? "bg-background" : "bg-background";
  const headingColor = isDark ? "text-background" : "text-foreground";
  const subtleText = isDark ? "text-background/60" : "text-foreground/60";
  const mutedText = isDark ? "text-background/50" : "text-foreground/50";
  const accentBg = isDark ? "bg-background" : "bg-foreground";
  const accentText = isDark ? "text-foreground" : "text-background";
  const borderColor = isDark ? "border-background/10" : "border-foreground/10";

  return (
    <section className={`py-20 md:py-32 ${surfaceBg} relative`}>
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }}
          className="anim-up-30 flex flex-col items-center text-center max-w-3xl mx-auto mb-14 md:mb-20"
        >
          <SectionLabel tone={isDark ? "dark" : "light"} className="mb-6">
            The Collection
          </SectionLabel>
          <h2 className={`text-4xl md:text-6xl font-heading font-light leading-tight ${headingColor}`}>
            {heading.split(" ").slice(0, -1).join(" ")}{" "}
            <span className={`italic ${isDark ? "text-background/60" : "text-foreground/60"}`}>{heading.split(" ").slice(-1)[0]}</span>
          </h2>
          <p className={`mt-6 text-base md:text-lg ${subtleText} font-light max-w-xl leading-relaxed`}>
            {subheading}
          </p>
        </motion.div>

        {/* Product grid
            Breakpoint note: a custom 480px min-width variant transitions the
            grid from one column (very small phones) to two columns on larger
            mobile devices, before the standard sm/lg breakpoints take over. */}
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-14 md:mb-20">
          {loading ? (
            // Skeleton
            Array.from({ length: limit }).map((_, i) => (
              <div key={i} className={`rounded-2xl ${surfaceBg} p-1.5 ring-1 ${borderColor}`}>
                <div className="aspect-[3/4] rounded-xl bg-foreground/5 animate-pulse" />
              </div>
            ))
          ) : (
            products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.32, 0.72, 0, 1] }}
                className={`anim-up-30 group relative flex flex-col ${cardBg} rounded-[1rem] md:rounded-[1.5rem] border ${borderColor} p-1 md:p-1.5 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}
              >
                <Link
                  href={`/product/${product.id}`}
                  className="absolute inset-0 z-30 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  aria-label={`View ${product.name}`}
                />
                {/* Uniform 3:4 cards — matching the shop grid and product
                    page framing. object-cover crops rather than letterboxes,
                    which keeps every card in the row the same height (the
                    old natural-height version left large white gaps when
                    one image in a row was shorter than the others). */}
                <div className="relative w-full aspect-[3/4] bg-foreground/[0.03] rounded-[calc(1rem-0.25rem)] md:rounded-[calc(1.5rem-0.375rem)] overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2.5s] ease-[0.32,0.72,0,1] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/30 text-xs uppercase tracking-widest">
                      No Image
                    </div>
                  )}
                  {product.tags?.[0] && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`${cardBg}/90 backdrop-blur-md ${subtleText} text-[11px] md:text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm`}>
                        {product.tags[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`flex justify-between items-end p-3 md:p-4 ${cardBg}`}>
                  <div>
                    <h3 className={`font-medium text-sm md:text-base ${headingColor} mb-0.5 md:mb-1`}>{product.name}</h3>
                    <p className={`text-[11px] md:text-xs ${mutedText}`}>${product.price.toFixed(2)}</p>
                  </div>
                  <div className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full ${accentBg} ${accentText} shrink-0 shadow-md transition-all duration-300 group-hover:scale-110`}>
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* "Shop Now" CTA */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="anim-up-20 flex justify-center"
        >
          <PillButton href="/shop" variant={isDark ? "light" : "dark"}>Shop Now</PillButton>
        </motion.div>
      </div>
    </section>
  );
}
