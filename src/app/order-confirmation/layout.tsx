import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "Your DRMA order confirmation and details.",
};

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
