import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The site's canonical call-to-action: a rounded pill with an uppercase
 * tracked label and a circular icon "button-in-button" on the right.
 * Reference implementation: the "Read The Manifesto" button on /about.
 *
 * Every CTA on the storefront and dashboard should be one of these —
 * do not hand-roll new pill buttons. Variants:
 *   dark   — espresso pill on light surfaces (default)
 *   light  — cream pill on dark surfaces
 *   gold   — brand-gold pill (hero-level emphasis only)
 *   paypal — PayPal-branded checkout submit
 *
 * `fullWidth` centers the label and pins the icon to the right edge
 * (used for form submits: Add to Cart, Secure Checkout, Pay with PayPal).
 */

type Variant = "dark" | "light" | "gold" | "paypal";
type Size = "md" | "sm";
type Icon = "up-right" | "right" | "check" | "none";

interface PillButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  size?: Size;
  icon?: Icon;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const VARIANT_STYLES: Record<Variant, { pill: string; circle: string }> = {
  dark: {
    pill: "bg-foreground text-background hover:bg-foreground/90",
    circle: "bg-background/20",
  },
  light: {
    pill: "bg-background text-foreground hover:bg-background/90",
    circle: "bg-foreground/10",
  },
  gold: {
    pill: "bg-gold text-white hover:bg-gold/90",
    circle: "bg-white/20",
  },
  paypal: {
    pill: "bg-[#FFC439] text-[#003087] font-bold hover:bg-[#F4BB33] hover:shadow-[0_0_20px_rgba(255,196,57,0.3)]",
    circle: "bg-white/30",
  },
};

const ICONS: Record<Exclude<Icon, "none">, typeof ArrowUpRight> = {
  "up-right": ArrowUpRight,
  right: ArrowRight,
  check: Check,
};

export function PillButton({
  children,
  href,
  onClick,
  type = "button",
  variant = "dark",
  size = "md",
  icon = "up-right",
  fullWidth = false,
  disabled = false,
  className,
  ariaLabel,
}: PillButtonProps) {
  const styles = VARIANT_STYLES[variant];
  const IconComp = icon === "none" ? null : ICONS[icon];

  const pillClasses = cn(
    "group relative inline-flex items-center rounded-full font-medium tracking-wide transition-all active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    size === "md"
      ? icon === "none" ? "px-8 py-2 text-sm" : "gap-4 pl-8 pr-2 py-2 text-sm"
      : icon === "none" ? "px-6 py-1.5 text-sm" : "gap-3 pl-6 pr-1.5 py-1.5 text-sm",
    fullWidth && "w-full justify-center",
    disabled
      ? "bg-foreground/10 text-foreground/30 cursor-not-allowed hover:bg-foreground/10"
      : styles.pill,
    className
  );

  const labelClasses = cn(
    "uppercase tracking-widest",
    size === "md" ? "text-xs py-3" : "text-[11px] py-1.5"
  );

  const circleClasses = cn(
    "flex items-center justify-center rounded-full transition-transform duration-300 ease-spring group-hover:translate-x-1 group-hover:scale-105",
    size === "md" ? "h-10 w-10" : "h-7 w-7",
    fullWidth && "absolute right-2 group-hover:translate-x-0 group-hover:scale-105",
    !disabled && styles.circle
  );

  const content = (
    <>
      <span className={labelClasses}>{children}</span>
      {IconComp && !disabled && (
        <span className={circleClasses}>
          <IconComp className={size === "md" ? "h-4 w-4 stroke-[1.5]" : "h-3.5 w-3.5 stroke-[1.5]"} />
        </span>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} onClick={onClick} className={pillClasses} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={pillClasses} aria-label={ariaLabel}>
      {content}
    </button>
  );
}
