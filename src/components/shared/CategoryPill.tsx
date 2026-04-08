import Link from "next/link";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  active?: boolean;
  size?: "sm" | "md";
}

export function CategoryPill({
  name,
  slug,
  color,
  icon,
  active,
  size = "md",
}: CategoryPillProps) {
  return (
    <Link
      href={`/explore?category=${slug}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150 whitespace-nowrap",
        size === "sm"
          ? "px-2.5 py-1 text-xs"
          : "px-3.5 py-1.5 text-sm",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      style={
        active && color
          ? { backgroundColor: color, color: "#fff" }
          : undefined
      }
    >
      {icon && <span className="text-xs">{icon}</span>}
      {name}
    </Link>
  );
}

interface TagBadgeProps {
  name: string;
  slug?: string;
  className?: string;
}

export function TagBadge({ name, slug, className }: TagBadgeProps) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
    >
      #{name}
    </span>
  );

  if (slug) {
    return <Link href={`/explore?tag=${slug}`}>{inner}</Link>;
  }
  return inner;
}
