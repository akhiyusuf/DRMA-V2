import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 md:py-16 mt-auto">
      <div className="container mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-8 md:gap-y-12">
        <div className="col-span-2 md:col-span-2">
          <Link href="/" className="text-2xl md:text-3xl font-heading font-light tracking-widest text-background inline-block mb-4 md:mb-6">
            DRMA
          </Link>
          <p className="text-background/70 md:max-w-md w-full text-xs md:text-sm leading-relaxed mb-4 md:mb-6">
            Designing Resourceful Modest Attire. We are committed to ending child labor in the fashion industry while providing elegant, ethically-produced modest clothing for Muslim women worldwide.
          </p>
        </div>
        
        <div className="col-span-1">
          <h4 className="font-heading tracking-wide uppercase text-[10px] md:text-xs mb-4 md:mb-6 text-background/90">Shop</h4>
          <ul className="space-y-3 md:space-y-4 text-[11px] md:text-sm text-background/70">
            <li><Link href="/shop?category=abayas" className="hover:text-background transition-colors">Abayas</Link></li>
            <li><Link href="/shop?category=hijabs" className="hover:text-background transition-colors">Hijabs</Link></li>
            <li><Link href="/shop?category=dresses" className="hover:text-background transition-colors">Dresses</Link></li>
            <li><Link href="/shop?category=sets" className="hover:text-background transition-colors">Matching Sets</Link></li>
          </ul>
        </div>
        
        <div className="col-span-1">
          <h4 className="font-heading tracking-wide uppercase text-[10px] md:text-xs mb-4 md:mb-6 text-background/90">About</h4>
          <ul className="space-y-3 md:space-y-4 text-[11px] md:text-sm text-background/70">
            <li><Link href="/ethics" className="hover:text-background transition-colors">Our Mission</Link></li>
            <li><Link href="/about" className="hover:text-background transition-colors">Our Story</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 mt-10 md:mt-16 pt-6 md:pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between text-[11px] md:text-xs text-background/50">
        <p>&copy; {new Date().getFullYear()} DRMA. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link href="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-background transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
