import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Management",
  description: "DRMA content management dashboard.",
};

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
