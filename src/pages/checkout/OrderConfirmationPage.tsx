function OrderNextVolumePrompt({ bookIds }: { bookIds: number[] }) {
  const { dict } = useT();
  const vDict = dict.seriesVolumes;

  // Check next volume for the books in order
  const firstBookId = bookIds[0] ?? 0;
  const nextQuery = useQuery(catalogQueries.nextVolume(firstBookId));
  const nextBook = nextQuery.data;

  if (!nextBook) return null;

  return (
    <div className="shop-card group flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        {nextBook.cover_image_url ? (
          <img
            src={nextBook.cover_image_url}
            alt={nextBook.title}
            className="h-24 w-16 shrink-0 -rotate-3 rounded-[3px] object-cover shadow-[0_14px_22px_-12px_rgb(20_16_10/0.6)] transition-transform duration-500 group-hover:rotate-0 motion-reduce:transform-none"
          />
        ) : null}
        <div className="grid gap-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {vDict.nextVolumeAfterOrder}
          </span>
          <span className="font-semibold text-foreground">{nextBook.title}</span>
          <span className="text-sm text-muted-foreground">{vDict.nextVolumeOrderPrompt}</span>
        </div>
      </div>
      <Link
        to={`/books/${nextBook.id}`}
        className={buttonVariants({ className: "shrink-0 gap-1.5" })}
      >
        <span>{vDict.nextVolume}</span>
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

import { RewardCouponCard } from "@/features/rewards/RewardBits";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, PackageCheck, Send, Truck, ArrowRight } from "lucide-react";
import { catalogQueries } from "@/api/endpoints/catalog";
import { Link, useLocation, useParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import type { Order } from "@/api/types";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { CheckoutProgress } from "@/components/shopping/CheckoutProgress";
import { CoverStack } from "@/components/shopping/CoverStack";
import { Seal } from "@/components/shopping/Seal";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { DeliveryAddressCard, OrderItemsCard } from "@/features/orders/OrderSummary";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { Rich } from "@/i18n/Rich";

/*
 * /checkout/success/:id: thank-you page (pages/shopping.md): the checkout rail at "Done", a thank-you panel (a
 * seal that draws its check, the order number, dates and the covers just bought over their colour wash), the
 * three next steps on one line, then the order, the address and Telegram updates. Shows the order straight from the
 * checkout response (router state) and refreshes it from GET /orders/{id}, so a
 * reload or a shared link works too. Lines are in USD (the API's order lines);
 * the total also in riel.
 */

const nextSteps = [
  { Icon: PackageCheck, title: "step1", text: "step1Text" },
  { Icon: Truck, title: "step2", text: "step2Text" },
  { Icon: CheckCircle2, title: "step3", text: "step3Text" },
] as const;

export default function OrderConfirmationPage() {
  const id = Number(useParams().id);
  const state = useLocation().state as { order?: Order; covers?: { src?: string | null; title?: string | null }[] } | null;
  const fromCheckout = state?.order;
  const covers = fromCheckout?.id === id ? (state?.covers ?? []) : [];
  const order = useQuery({ ...orderQueries.order(id), enabled: Number.isInteger(id) && id > 0, initialData: fromCheckout?.id === id ? fromCheckout : undefined });
  const { dict, locale } = useT();
  const k = dict.checkoutPage;
  const s = dict.shopping;
  useDocumentTitle(order.data ? dict.orders.orderNumber(order.data.order_number ?? "") : k.orderConfirmed);

  if (!Number.isInteger(id) || id <= 0 || (order.isError && ApiError.from(order.error).kind === "not_found")) {
    return <NotFoundState what={dict.nouns.whatOrder} backTo="/account" backLabel={k.goToAccount} />;
  }
  if (order.isError) return <div className="container-shell py-16"><ErrorState error={order.error} onRetry={() => order.refetch()} headingLevel="h1" /></div>;
  if (!order.data) {
    return (
      <div className="container-shell py-12">
        <SkeletonGroup label={k.loadingOrder} className="grid gap-6">
          <Skeleton className="h-64 rounded-3xl" />
          <div className="grid gap-6 lg:grid-cols-12">
            <Skeleton className="h-72 rounded-2xl lg:col-span-7" />
            <Skeleton className="h-72 rounded-2xl lg:col-span-5" />
          </div>
        </SkeletonGroup>
      </div>
    );
  }

  const o = order.data;
  const lead = covers.find((c) => c.src)?.src;

  return (
    <div className="overflow-x-clip pb-20">
      <div className="container-shell grid gap-10 pt-6 sm:pt-8">
        <CheckoutProgress current="done" withPay={o.payment_method === "khqr"} className="justify-self-end" />

        {/* The thank-you panel: seal, title, order number and dates on the left; the books just bought on the right,
            over a soft wash of the first cover's colours. */}
        <header className="shop-card group relative isolate grid items-center gap-8 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 lg:p-12">
          {lead ? <img src={lead} alt="" aria-hidden="true" className="hero-wash pointer-events-none absolute -right-20 top-1/2 -z-10 h-[160%] w-2/3 -translate-y-1/2 object-cover opacity-20 blur-3xl saturate-150" /> : null}
          <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--card)_40%,transparent)]" aria-hidden="true" />
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <Seal />
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="grid gap-3">
              <h1 className="font-display text-[2.441rem] leading-[1.08] sm:text-[3.052rem]">{k.thankYou}</h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                <Rich text={k.placedLead(o.order_number ?? "")} strong="font-semibold tabular-nums text-foreground" />
              </p>
            </div>
            <dl className="grid gap-x-10 gap-y-3 border-t border-dashed border-border pt-5 sm:grid-cols-[auto_auto] sm:justify-start">
              {o.placed_at ? (
                <div className="grid gap-1">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.placedOn}</dt>
                  <dd className="text-[15px]">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(o.placed_at))}</dd>
                </div>
              ) : null}
              {o.estimated_delivery?.formatted ? (
                <div className="grid gap-1">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.arriving}</dt>
                  <dd className="flex items-start gap-1.5 text-[15px] font-medium">
                    <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{k.estDelivery(o.estimated_delivery.formatted)}</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          {covers.some((c) => c.src) ? <CoverStack items={covers} size="xl" max={4} className="hidden justify-self-center sm:block lg:mr-4" /> : null}
        </header>

        {/* Paid by KHQR: the next-order reward is already made (owner 2026-11-12). */}
        <RewardCouponCard coupon={o.reward_coupon} />

        {/* What happens next: three stops on one line; the first is where the order is now. */}
        <section aria-labelledby="whats-next" className="grid gap-6">
          <h2 id="whats-next" className="font-display text-[1.75rem] leading-tight">
            {k.whatNext}
          </h2>
          <ol className="relative grid gap-6 sm:grid-cols-3 sm:gap-8">
            <span className="absolute left-[16.66%] right-[16.66%] top-6 hidden h-px bg-[linear-gradient(to_right,var(--border)_50%,transparent_0)] bg-[length:8px_1px] sm:block" aria-hidden="true" />
            {nextSteps.map(({ Icon, title, text }, i) => (
              <li key={title} className="relative grid content-start justify-items-start gap-3 sm:justify-items-center sm:text-center" aria-current={i === 0 ? "step" : undefined}>
                <span className={cn("relative grid size-12 place-items-center rounded-full", i === 0 ? "bg-primary text-primary-foreground shadow-[0_0_0_6px_color-mix(in_srgb,var(--primary)_14%,transparent)]" : "bg-card text-primary shadow-[inset_0_0_0_1px_var(--border)]")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{k.step(i + 1)}</span>
                <span className="font-display text-[1.2rem] leading-snug">{k[title]}</span>
                <span className="max-w-xs text-sm text-muted-foreground">{k[text]}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="grid gap-6 lg:col-span-7">
            <OrderItemsCard order={o} totalLabel={Number(o.credit_used_usd) > 0 ? dict.orderParts.total : k.totalOnDelivery} className="shop-card rounded-2xl" />
            {o.items && o.items.length > 0 ? (
              <OrderNextVolumePrompt bookIds={o.items.map((i) => i.book_id).filter((id): id is number => typeof id === "number")} />
            ) : null}
          </div>
          <div className="grid gap-6 lg:col-span-5">
            <DeliveryAddressCard address={o.shipping_address} className="shop-card rounded-2xl" />
            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
                  <Send className="size-[18px]" aria-hidden="true" />
                </span>
                <div className="grid gap-0.5">
                  <span className="font-semibold text-foreground">{k.telegramUpdatesTitle}</span>
                  <span className="text-sm text-muted-foreground">{k.telegramUpdatesDesc}</span>
                </div>
              </div>
              <Link to="/account/profile" className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
                {k.manage}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/books" className={buttonVariants({ size: "lg" })}>
            {k.keepBrowsing} <ArrowRight aria-hidden="true" />
          </Link>
          <Link to={`/account/orders/${o.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {k.viewOrder}
          </Link>
          {o.status !== "cancelled" ? (
            <Link
              to={`/account/orders/${o.id}/invoice?autoprint=1`}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <FileText className="size-4" aria-hidden="true" />
              {dict.orders.printReceipt}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
