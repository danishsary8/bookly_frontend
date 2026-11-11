import { CheckCircle2, Truck } from "lucide-react";
import { formatMoney, useCurrency } from "@/stores/currency";
import { policy } from "@/content/shop";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Free-delivery progress (pages/shopping.md). The numbers come from the API's threshold (the shop's setting as a
 * fallback), never invented. A gold-to-lapis track fills by transform (scaleX) and a small truck rides its end;
 * once reached, the bar turns success green with a check. The sentence above the track says it all in words.
 */

interface Props {
  subtotalUsd?: string | number | null;
  thresholdUsd?: string | number | null;
  /** The API says delivery is already free (an offer with free delivery): show the reached state at any amount. */
  free?: boolean;
  className?: string;
}

export function FreeShippingBar({ subtotalUsd, thresholdUsd, free = false, className }: Props) {
  const currency = useCurrency();
  const { dict } = useT();
  const f = dict.freeShipping;

  const subtotal = Number(subtotalUsd || 0);
  const threshold = Number(thresholdUsd || policy.freeShippingThresholdUsd || 50);
  if (threshold <= 0 && !free) return null;

  const diff = free ? 0 : Math.max(0, threshold - subtotal);
  const ratio = free ? 1 : Math.min(1, subtotal / threshold);
  const unlocked = diff <= 0;

  return (
    <div
      role="region"
      aria-label={f.region}
      className={cn("grid gap-2.5 rounded-xl border p-3.5", unlocked ? "border-success/30 bg-success-tint" : "border-border bg-surface-2/60", className)}
    >
      <p className="flex items-start gap-2.5 text-sm font-medium leading-snug">
        {unlocked ? (
          <CheckCircle2 className="mt-px size-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Truck className="mt-px size-4 shrink-0 text-primary" aria-hidden="true" />
        )}
        <span className={unlocked ? "font-semibold text-success" : "text-foreground"}>
          {unlocked ? f.unlocked : f.addMore(formatMoney(diff.toFixed(2), null, currency), formatMoney(threshold.toFixed(2), null, currency))}
        </span>
      </p>
      <div className="relative h-2 rounded-full bg-card shadow-[inset_0_0_0_1px_var(--border)]" aria-hidden="true">
        <span
          className={cn(
            "absolute inset-0 origin-left rounded-full transition-transform duration-700 ease-out motion-reduce:transition-none",
            unlocked ? "bg-success" : "bg-[linear-gradient(90deg,var(--gold),var(--primary))]",
          )}
          style={{ transform: `scaleX(${ratio})` }}
        />
        {unlocked ? null : (
          // The rider: a full-width layer slid by transform, carrying the truck at its left edge.
          <span className="absolute inset-0 transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translateX(${Math.max(4, ratio * 100)}%)` }}>
            <span className="absolute left-0 top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_10px_-4px_rgb(20_32_122/0.7)]">
              <Truck className="size-3" />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
