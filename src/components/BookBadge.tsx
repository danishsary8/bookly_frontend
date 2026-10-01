import { Ban, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * MASTER §6.3: badges that differ by *form*, not just colour: a notched tag (Sale),
 * a square block (New), a tinted chip with a 3-segment meter (Low stock) and a
 * dashed outline (Out of stock). Each always carries an icon and written text.
 */

const base = "inline-flex h-6 items-center gap-1.5 whitespace-nowrap px-2 text-xs font-bold uppercase leading-none tracking-[0.12em]";

export const SaleBadge = ({ label = "Sale", className }: { label?: string; className?: string }) => (
  <span className={cn(base, "rounded-r-md bg-accent pl-3.5 text-accent-foreground [clip-path:polygon(8px_0,100%_0,100%_100%,8px_100%,0_50%)]", className)}>
    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
    {label}
  </span>
);

export const NewBadge = ({ className }: { className?: string }) => (
  <span className={cn(base, "rounded-none bg-primary text-primary-foreground", className)}>
    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
    New
  </span>
);

export const LowStockBadge = ({ remaining, className }: { remaining: number; className?: string }) => (
  <span className={cn(base, "rounded-md bg-warning/12 text-warning", className)}>
    <span className="inline-flex gap-0.5" aria-hidden="true">
      <i className="block h-2.5 w-1 rounded-[1px] bg-current" />
      <i className="block h-2.5 w-1 rounded-[1px] bg-current opacity-30" />
      <i className="block h-2.5 w-1 rounded-[1px] bg-current opacity-30" />
    </span>
    Only {remaining} left
  </span>
);

export const OutOfStockBadge = ({ className }: { className?: string }) => (
  <span className={cn(base, "rounded-md border-[1.5px] border-dashed border-muted-foreground text-muted-foreground", className)}>
    <Ban className="h-3.5 w-3.5" aria-hidden="true" />
    Out of stock
  </span>
);

const LOW_STOCK_THRESHOLD = 5;

/** Stock badge for a known stock number; renders nothing when comfortably in stock. */
export const StockBadge = ({ stock, className }: { stock: number | undefined; className?: string }) => {
  if (stock === undefined || !Number.isFinite(stock)) return null;
  if (stock <= 0) return <OutOfStockBadge className={className} />;
  if (stock <= LOW_STOCK_THRESHOLD) return <LowStockBadge remaining={stock} className={className} />;
  return null;
};
