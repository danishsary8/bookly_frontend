import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { rewardQueries, type RewardCoupon } from "@/api/endpoints/rewards";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { setCoupon } from "@/features/cart/couponStore";
import { AccountSection } from "@/features/account/AccountSection";
import { percentLabel } from "@/features/offers/percent";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * /account/coupons (owner 2026-11-12): the customer's next-order reward coupons, usable ones first. A usable coupon
 * has "Use in cart" (it is saved for the cart and checkout, which check it again).
 */
function status(c: RewardCoupon, r: ReturnType<typeof useT>["dict"]["rewards"]) {
  if (c.is_usable) return { label: r.ready, className: "bg-success-tint text-success" };
  if (c.used) return { label: r.used, className: "bg-surface-2 text-muted-foreground" };
  if (c.expired) return { label: r.expired, className: "bg-surface-2 text-muted-foreground" };
  return { label: r.off, className: "bg-surface-2 text-muted-foreground" };
}

export default function CouponsPage() {
  const { dict, locale } = useT();
  const r = dict.rewards;
  const currency = useCurrency();
  useDocumentTitle(r.pageTitle);
  const coupons = useQuery(rewardQueries.myCoupons());

  return (
    <AccountSection title={r.pageTitle} lead={r.pageLead}>
      {coupons.isPending ? (
        <SkeletonGroup label={r.loading} className="grid gap-4">
          <SkeletonRow />
          <SkeletonRow />
        </SkeletonGroup>
      ) : coupons.isError ? (
        <ErrorState error={coupons.error} onRetry={() => coupons.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : coupons.data.length === 0 ? (
        <div className="shop-card grid justify-items-start gap-3 rounded-2xl border border-border bg-card p-6">
          <span className="grid size-12 place-items-center rounded-full bg-lapis-tint text-primary">
            <Gift className="size-6" aria-hidden="true" />
          </span>
          <h2 className="font-display text-[1.563rem] leading-tight">{r.noneTitle}</h2>
          <p className="max-w-prose text-muted-foreground">{r.none}</p>
          <Link to="/books" className={buttonVariants()}>
            {r.shopNow} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {coupons.data.map((c) => {
            const s = status(c, r);
            return (
              <li key={c.id} className={cn("shop-card grid gap-3 rounded-2xl border bg-card p-5", c.is_usable ? "border-success/30" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-[1.375rem] leading-tight">{r.cardTitle(percentLabel(c.percent_off))}</h2>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>{s.label}</span>
                </div>
                <code className={cn("justify-self-start rounded-lg border-2 border-dashed px-3 py-1 font-mono text-base font-bold tracking-wider", c.is_usable ? "border-success/50 bg-success-tint text-success" : "border-border text-muted-foreground")}>
                  {c.code}
                </code>
                <p className="text-sm text-muted-foreground">
                  {[c.max_discount_usd ? r.upTo(formatMoney(c.max_discount_usd, null, currency)) : null, c.expires_at ? r.until(orderDate(c.expires_at, locale)) : null, c.earned_by_order.order_number ? r.fromOrder(c.earned_by_order.order_number) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {c.is_usable ? (
                  <Link to="/cart" onClick={() => setCoupon(c.code)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "justify-self-start")}>
                    {r.useInCart} <ArrowRight aria-hidden="true" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AccountSection>
  );
}
