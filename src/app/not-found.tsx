import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-center px-6">
      <h1 className="text-6xl md:text-8xl font-heading font-light text-foreground/20">404</h1>
      <p className="text-foreground/50 text-lg max-w-md">This page doesn&apos;t exist. It may have moved or never existed.</p>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-xs font-medium uppercase tracking-widest transition-all hover:bg-foreground/90 active:scale-[0.98]"
        >
          Browse the Collection
        </Link>
        <Link href="/" className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">Return home</Link>
      </div>
    </div>
  );
}
