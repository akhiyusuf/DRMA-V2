"use client";

import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/context/CartContext";
import { AddToCartToast } from "@/components/layout/AddToCartToast";

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Skip-to-content link — first focusable element on every page that
          uses this shared layout. Visually hidden until keyboard-focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-foreground focus:text-background focus:text-xs focus:uppercase focus:tracking-widest focus:font-medium focus:rounded-full focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to Content
      </a>

      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.025] mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      <CartProvider>
        <Navbar />
        <AddToCartToast />
        <main role="main" aria-label="Main content" id="main-content" tabIndex={-1} className="flex-grow focus:outline-none">
          {children}
        </main>
        <Footer />
      </CartProvider>
    </>
  );
}