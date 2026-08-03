import { cn } from "@/lib/utils";

/**
 * The editorial heading pattern used on every page: a serif heading in
 * which the closing words render italic and muted, usually ending with
 * a period ("Secure Checkout.", "Your Cart.", "Curated Essentials.").
 * Reference implementations: /checkout and /cart page titles.
 *
 * `title` is the regular part, `accent` the italic muted part.
 * `breakBefore` puts the accent on its own line.
 */
const SIZES = {
  page: "text-4xl md:text-5xl lg:text-6xl",
  section: "text-3xl md:text-5xl",
  large: "text-4xl md:text-6xl",
} as const;

export function SectionHeading({
  title,
  accent,
  as: Tag = "h1",
  size = "page",
  tone = "light",
  breakBefore = false,
  className,
}: {
  title: string;
  accent?: string;
  as?: "h1" | "h2" | "h3";
  size?: keyof typeof SIZES;
  tone?: "light" | "dark";
  breakBefore?: boolean;
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        SIZES[size],
        "font-heading font-light tracking-tight",
        tone === "light" ? "text-foreground" : "text-background",
        className
      )}
    >
      {title}
      {accent && (
        <>
          {breakBefore ? <br /> : " "}
          <span className={cn("italic", tone === "light" ? "text-foreground/60" : "text-background/60")}>
            {accent}
          </span>
        </>
      )}
    </Tag>
  );
}
