import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of DRMA and drma.shop.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-24 container mx-auto px-6 max-w-3xl">
      <h1 className="text-4xl font-heading font-light mb-8 md:text-5xl lg:text-6xl">Terms of Service</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-foreground/70">
        <p>By accessing and using the DRMA website, you agree to comply with and be bound by the following terms and conditions.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">Use of the Site</h2>
        <p>You may use our site for lawful purposes only. You agree not to reproduce, duplicate, copy, sell, or exploit any portion of the site without express written permission.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">Product Information</h2>
        <p>We strive to display our products accurately. However, colors and details may vary depending on your screen settings.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">Orders &amp; Payment</h2>
        <p>All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order at our discretion.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">Contact</h2>
        <p>For questions about these terms, contact us at legal@drma.com.</p>
      </div>
    </div>
  );
}
