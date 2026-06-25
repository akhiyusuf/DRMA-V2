import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Checkout",
  description: "Securely complete your DRMA order.",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
