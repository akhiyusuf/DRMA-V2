import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "./client-layout";

export const metadata: Metadata = {
  title: {
    // Children only set the page name; the brand suffix is appended
    // automatically. The `default` is used when a child sets no title.
    default: "DRMA | Designing Resourceful Modest Attire",
    template: "%s | DRMA",
  },
  description:
    "Affordable, ethically produced modest clothing for Muslim women. We raise awareness against child labor in fashion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground relative selection:bg-primary selection:text-primary-foreground" suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}