import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How DRMA collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-16 md:pb-24 container mx-auto px-6 max-w-3xl">
      <h1 className="text-4xl font-heading font-light mb-8 md:text-5xl lg:text-6xl">Privacy Policy</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-foreground/70">
        <p>DRMA respects your privacy. This policy outlines how we collect, use, and protect your personal information.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">Information We Collect</h2>
        <p>We collect information you provide directly, such as your name, email address, and shipping details when you place an order.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">How We Use Your Information</h2>
        <p>Your information is used solely to process orders, communicate about your purchases, and improve our services. We never sell your data.</p>
        <h2 className="text-xl font-heading text-foreground mt-8 mb-4">Contact</h2>
        <p>For privacy-related inquiries, contact us at privacy@drma.com.</p>
      </div>
    </div>
  );
}
