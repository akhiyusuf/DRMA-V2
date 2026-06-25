import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story behind DRMA — designing resourceful modest attire for Muslim women, ethically and transparently.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
