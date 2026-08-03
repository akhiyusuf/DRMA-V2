import { cn } from "@/lib/utils";

/**
 * The small uppercase chip that introduces a section or page
 * ("The Origin", "The Manifesto", "Foundation", "The Vault", …).
 * Reference implementation: the "The Origin" chip on /about.
 *
 * `tone="dark"` inverts it for dark surfaces.
 */
export function SectionLabel({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] font-medium border",
        tone === "light"
          ? "bg-foreground/5 text-foreground/70 border-foreground/10"
          : "bg-background/5 text-background/70 border-background/10",
        className
      )}
    >
      {children}
    </span>
  );
}
