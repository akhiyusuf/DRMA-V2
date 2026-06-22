"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Package, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface OrderData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedSize: string;
    selectedColor: string;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const cancelled = searchParams.get("cancelled");
    const mock = searchParams.get("mock");

    if (cancelled === "true") {
      setIsCancelled(true);
      return;
    }

    if (success === "true") {
      setIsMock(mock === "true");
      try {
        const stored = sessionStorage.getItem("drma_pending_order");
        if (stored) {
          setOrder(JSON.parse(stored));
          sessionStorage.removeItem("drma_pending_order");
          clearCart();
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams, clearCart]);

  if (isCancelled) {
    return (
      <div className="w-full bg-background min-h-screen pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-8 max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          >
            <h1 className="text-4xl md:text-5xl font-heading font-light tracking-tight mb-6">
              Payment <span className="italic text-foreground/60">Cancelled.</span>
            </h1>
            <p className="text-foreground/60 font-light text-lg mb-10">
              Your payment was not completed. Your cart has been preserved.
            </p>
            <Link
              href="/checkout"
              className="group relative inline-flex items-center gap-4 rounded-full bg-foreground pl-8 pr-2 py-2 text-sm font-medium tracking-wide text-background transition-all"
            >
              <span className="uppercase tracking-widest text-xs py-3">Return to Checkout</span>
              <div className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/20">
                <ArrowRight className="h-4 w-4 stroke-[1.5]" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full bg-background min-h-screen pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-8 max-w-2xl text-center">
          <h1 className="text-4xl font-heading font-light tracking-tight mb-6">No order found.</h1>
          <Link href="/shop" className="text-primary underline">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background min-h-screen selection:bg-primary selection:text-primary-foreground pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-8 max-w-3xl">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="text-center mb-16"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-light tracking-tight mb-4">
            Thank You, <span className="italic text-foreground/60">{order.firstName}.</span>
          </h1>
          <p className="text-foreground/60 font-light text-lg">
            {isMock 
              ? "Your test order has been received. Connect PayPal credentials for live payments."
              : "Your order has been confirmed. A confirmation email will be sent shortly."
            }
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          className="p-1.5 rounded-[2rem] bg-foreground/5 ring-1 ring-foreground/10 mb-12"
        >
          <div className="rounded-[calc(2rem-0.375rem)] bg-background p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-foreground/10">
              <Package className="w-5 h-5 text-foreground/50" />
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/50">Order Details</h2>
            </div>

            <div className="space-y-6 mb-8">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-foreground/5 last:border-0">
                  <div>
                    <p className="font-heading text-lg">{item.name}</p>
                    <p className="text-xs text-foreground/50 uppercase tracking-widest">
                      {item.selectedColor} / {item.selectedSize} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-light tracking-widest">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm font-light pt-6 border-t border-foreground/10">
              <div className="flex justify-between">
                <span className="text-foreground/70">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Shipping</span>
                <span>${order.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Tax</span>
                <span>${order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-heading text-2xl pt-4 border-t border-foreground/10">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-foreground/10">
              <p className="text-xs text-foreground/40">
                Confirmation sent to <span className="text-foreground/60">{order.email}</span>
              </p>
              <p className="text-xs text-foreground/40 mt-1">
                Shipping to {order.address}, {order.city}, {order.state} {order.zip}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="text-center">
          <Link
            href="/shop"
            className="group relative inline-flex items-center gap-4 rounded-full bg-foreground pl-8 pr-2 py-2 text-sm font-medium tracking-wide text-background transition-all active:scale-[0.98] hover:bg-foreground/90"
          >
            <span className="uppercase tracking-widest text-xs py-3">Continue Shopping</span>
            <div className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-background/20 transition-transform duration-300 ease-spring group-hover:scale-105">
              <ArrowRight className="h-4 w-4 stroke-[1.5]" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="w-full bg-background min-h-screen pt-32 pb-24 flex items-center justify-center">
        <div className="animate-pulse font-heading text-2xl text-foreground/30 tracking-[0.3em]">Processing...</div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}