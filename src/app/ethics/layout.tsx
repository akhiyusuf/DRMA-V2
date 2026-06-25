import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Mission",
  description:
    "DRMA exists to prove that beautiful, modest fashion does not require exploitation. Learn how we fight child labor and unethical practices in the fashion industry.",
};

export default function EthicsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
