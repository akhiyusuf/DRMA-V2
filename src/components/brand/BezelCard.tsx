import { cn } from "@/lib/utils";

/**
 * The "double bezel" card: a soft outer frame with a recessed inner
 * surface and hairline highlight. Reference implementations: the order
 * summary on /checkout and the Problem/Solution cards on /ethics.
 *
 * `radius` matches the three radii in use across the site.
 * `innerClassName` styles the inner surface (padding, bg overrides).
 */
const RADII = {
  "1.5rem": { outer: "rounded-[1.5rem] p-1", inner: "rounded-[calc(1.5rem-0.25rem)]" },
  "2rem": { outer: "rounded-[2rem] p-1.5", inner: "rounded-[calc(2rem-0.375rem)]" },
  "3rem": { outer: "rounded-[3rem] p-2", inner: "rounded-[calc(3rem-0.5rem)]" },
} as const;

export function BezelCard({
  children,
  radius = "2rem",
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  radius?: keyof typeof RADII;
  className?: string;
  innerClassName?: string;
}) {
  const r = RADII[radius];
  return (
    <div className={cn(r.outer, "bg-foreground/5 ring-1 ring-foreground/10", className)}>
      <div
        className={cn(
          r.inner,
          "bg-background shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
