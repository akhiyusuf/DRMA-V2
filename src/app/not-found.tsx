import type { Metadata } from "next";
import Link from "next/link";
import { PillButton } from "@/components/brand/PillButton";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-center px-6">
      <h1 className="text-6xl md:text-8xl font-heading font-light text-foreground/20">404</h1>
      <p className="text-foreground/50 text-lg max-w-md">This page doesn&apos;t exist. It may have moved or never existed.</p>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mt-4">
        <PillButton href="/shop">Browse the Collection</PillButton>
        <Link href="/" className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">Return home</Link>
      </div>
    </div>
  );
}
