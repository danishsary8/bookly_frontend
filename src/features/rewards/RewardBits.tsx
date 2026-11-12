import { useState } from "react";
import { Check, Copy, Gift, QrCode, TicketPercent } from "lucide-react";
import { setCoupon } from "@/features/cart/couponStore";
import { percentLabel } from "@/features/offers/percent";
import { orderDate } from "@/features/orders/format";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Next-order rewards and the KHQR saving in the shop (owner 2026-11-12; pages/shopping.md "Rewards and KHQR").
 * Everything renders nothing when the API sends no reward / no KHQR discount, so an older API looks as before.
 */

type CartReward = {
  percent_off?: string;
  max_discount_usd?: string | null;
  add_books?: number | null;
  earns?: boolean;
} | null | undefined;

/** "Add 1 more book to get 10% off your next order (up to $5.00)" / "This order earns 10% off your next order". */
export function RewardNudge({ reward, className }: { reward: CartReward; className?: string }) {
  const { dict } = useT();
  const currency = useCurrency();
  if (!reward?.percent_off) return null;
  const r = dict.rewards;
  const pct = percentLabel(reward.percent_off);
  const cap = reward.max_discount_usd ? formatMoney(reward.max_discount_usd, null, currency) : null;
  const text = reward.earns ? r.earns(pct, cap) : reward.add_books ? r.addMore(reward.add_books, pct, cap) : null;
  if (!text) return null;
  return (
    <p className={cn("flex items-start gap-2.5 text-sm", className)}>
      <Gift className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden="true" />
      <span>
        <span className="font-semibold text-foreground">{text}</span>
        {reward.earns ? <span className="text-muted-foreground"> · {r.whenPaid}</span> : null}
      </span>
    </p>
  );
}

/** "Pay by KHQR at checkout and save 3%". */
export function KhqrHint({ percent, className }: { percent: string | null | undefined; className?: string }) {
  const { dict } = useT();
  if (!percent || Number(percent) <= 0) return null;
  return (
    <p className={cn("flex items-start gap-2.5 text-sm", className)}>
      <QrCode className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="font-semibold text-foreground">{dict.rewards.khqrHint(percentLabel(percent))}</span>
    </p>
  );
}

/** In the cart summary instead of "Have a coupon code?": the customer's usable reward coupon, one tap to apply. */
export function RewardCouponSuggestion({ coupon, className }: { coupon: { code: string; percent_off: string }; className?: string }) {
  const { dict } = useT();
  return (
    <div className={cn("-my-1 flex items-center justify-between gap-3 border-l-2 border-success pl-2.5 text-sm text-success", className)}>
      <span className="flex min-w-0 items-center gap-2">
        <TicketPercent className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="font-semibold">{dict.rewards.youHave(percentLabel(coupon.percent_off))}</span>{" "}
          <span className="whitespace-nowrap font-bold uppercase tracking-wide">{coupon.code}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => setCoupon(coupon.code)}
        aria-label={dict.rewards.applyCode(coupon.code)}
        className="inline-flex min-h-9 shrink-0 items-center rounded-md px-2 font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {dict.rewards.apply}
      </button>
    </div>
  );
}

type OrderReward = { code?: string; percent_off?: string; max_discount_usd?: string | null; expires_at?: string | null; is_usable?: boolean } | null | undefined;

/** Order page: the coupon this order earned, with a copy button. */
export function RewardCouponCard({ coupon, className }: { coupon: OrderReward; className?: string }) {
  const { dict, locale } = useT();
  const currency = useCurrency();
  const [copied, setCopied] = useState<string | null>(null);
  if (!coupon?.code || !coupon.percent_off) return null;
  const r = dict.rewards;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code!);
      setCopied(r.copied);
    } catch {
      setCopied(r.copyFailed);
    }
  };
  return (
    <section aria-labelledby="reward-coupon-title" className={cn("shop-card grid gap-3 rounded-2xl border border-success/30 bg-card p-5", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-tint text-success">
          <Gift className="size-5" aria-hidden="true" />
        </span>
        <div className="grid gap-0.5">
          <h2 id="reward-coupon-title" className="font-display text-[1.375rem] leading-tight">
            {r.cardTitle(percentLabel(coupon.percent_off))}
          </h2>
          <p className="text-sm text-muted-foreground">{coupon.is_usable === false ? r.notUsable : r.cardLead}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <code className={cn("rounded-lg border-2 border-dashed border-success/50 bg-success-tint px-3 py-1.5 font-mono text-lg font-bold tracking-wider text-success", coupon.is_usable === false && "line-through opacity-60")}>
          {coupon.code}
        </code>
        {coupon.is_usable === false ? null : (
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {copied === r.copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {r.copy}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {[coupon.max_discount_usd ? r.upTo(formatMoney(coupon.max_discount_usd, null, currency)) : null, coupon.expires_at ? r.until(orderDate(coupon.expires_at, locale)) : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p role="status" className="sr-only">
        {copied}
      </p>
    </section>
  );
}
