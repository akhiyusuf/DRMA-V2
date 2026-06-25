import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Modest Fashion",
  description:
    "Browse the DRMA collection of ethically produced modest clothing — abayas, hijabs, dresses, sets, and more. Every piece is artisan-made and child-labor-free.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
