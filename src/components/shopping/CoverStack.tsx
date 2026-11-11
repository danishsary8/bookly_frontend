import { useState } from "react";
import { cn } from "@/lib/utils";

/*
 * A small fan of real book covers (pages/shopping.md): the books in a cart, an order, or popular ones for an
 * empty cart. Decorative: the same books are always named in text nearby, so the stack is aria-hidden.
 * Covers without an image get a cloth board with the title's first letter. On hover of a `.group` parent the
 * fan opens a little (no movement under reduced motion).
 */

const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#8A5A3B", "#4C5378", "#1E4E5C"];
const sizes = { sm: 30, md: 46, lg: 92, xl: 132 } as const;

type CoverItem = { src?: string | null; title?: string | null };

function Face({ item, index }: { item: CoverItem; index: number }) {
  const [failed, setFailed] = useState(false);
  if (item.src && !failed) {
    return <img src={item.src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-full object-cover" />;
  }
  return (
    <span className="grid size-full place-items-center font-display text-[min(2rem,45%)] text-[#F6EFDF]" style={{ background: CLOTH[index % CLOTH.length] }}>
      {(item.title ?? "B").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function CoverStack({ items, size = "md", max = 4, className }: { items: CoverItem[]; size?: keyof typeof sizes; max?: number; className?: string }) {
  const shown = items.slice(0, max);
  if (shown.length === 0) return null;
  const w = sizes[size];
  const step = w * 0.42;
  const mid = (shown.length - 1) / 2;

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: w + step * (shown.length - 1), height: w * 1.5 + w * 0.12 }}
    >
      {shown.map((item, i) => (
        <span
          key={i}
          className="cover-fan absolute bottom-0 overflow-hidden rounded-[3px] bg-muted shadow-[0_1px_2px_rgb(20_16_10/0.12),0_14px_22px_-14px_rgb(20_16_10/0.6)]"
          style={{ width: w, height: w * 1.5, left: step * i, zIndex: i + 1, "--fan-r": `${(i - mid) * 5}deg`, "--fan-x": `${(i - mid) * w * 0.08}px` } as React.CSSProperties}
        >
          <Face item={item} index={i} />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.2)_0_3%,rgb(255_255_255/0.16)_4%,transparent_10%)]" />
        </span>
      ))}
    </span>
  );
}
