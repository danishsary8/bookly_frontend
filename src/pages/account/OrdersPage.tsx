import { accountPage, useAccountPageBounds } from "@/features/account/pagination";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package, QrCode } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import type { Order, OrderStatus } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { SelectField } from "@/components/form/Field";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { rangeText, useT } from "@/i18n";

const PER_PAGE = 10;
const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled", "returned"];
const isStatus = (value: string | null): value is OrderStatus => STATUSES.some((s) => s === value);

/* Where an order is on its way (MASTER §6.3a timeline steps), as a quiet five-segment meter; the badge says it in words. */
const STEPS = ["pending", "paid", "processing", "shipped", "delivered"] as const;

function OrderRow({ order }: { order: Order }) {
  const currency = useCurrency();
  const { dict, locale } = useT();
  const titles = (order.items ?? []).map((item) => item.title).filter(Boolean);
  const more = titles.length > 2 ? dict.orders.andMore(titles.length - 2) : "";
  return (
    <li>
      <Link
        to={`/account/orders/${order.id}`}
        className="group grid gap-3 shop-card rounded-2xl border border-border bg-card p-4 outline-none transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-primary/50 motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
      >
        <span className="grid min-w-0 gap-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold tabular-nums">{order.order_number}</span>
            <OrderStatusBadge status={order.status} />
          </span>
          <span className="truncate text-[15px]">
            {titles.slice(0, 2).join(", ")}
            {more}
          </span>
          <span className="text-sm text-muted-foreground">
            {orderDate(order.placed_at, locale)}
            {order.item_count ? ` · ${dict.orders.items(order.item_count)}` : null}
          </span>
          {STEPS.includes(order.status as (typeof STEPS)[number]) ? (
            <span className="mt-1 flex w-40 gap-1" aria-hidden="true">
              {STEPS.map((step, i) => (
                <span key={step} className={cn("h-1 flex-1 rounded-full", i <= STEPS.indexOf(order.status as (typeof STEPS)[number]) ? (order.status === "delivered" ? "bg-success" : "bg-primary") : "bg-surface-2")} />
              ))}
            </span>
          ) : null}
          {order.payment_method === "khqr" && order.payment_status === "pending" && order.status === "pending" && order.payment_due_at ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lapis-tint px-2.5 py-0.5 text-sm font-semibold text-primary">
              <QrCode className="size-4" aria-hidden="true" /> {dict.orders.payNow} · {dict.orders.payBy(new Date(order.payment_due_at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }))}
            </span>
          ) : null}
        </span>
        <span className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="font-semibold tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {dict.orders.view} <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

/*
 * /account/orders: the customer's orders, newest first, with a status filter.
 * Page and status live in the URL so Back and shared links keep them.
 */
export default function OrdersPage() {
  const { dict } = useT();
  const t = dict.orders;
  useDocumentTitle(t.docTitle);
  const [params, setParams] = useSearchParams();
  const page = accountPage(params.get("page"));
  const statusParam = params.get("status");
  const status = isStatus(statusParam) ? statusParam : undefined;
  const orders = useQuery({ ...orderQueries.orders({ page, per_page: PER_PAGE, status }), placeholderData: (previous) => previous });
  const showSkeleton = useSkeletonVisible(orders.isPending);
  const meta = orders.data?.meta;
  useAccountPageBounds(meta, orders.isPlaceholderData);
  const list = orders.data?.data ?? [];

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (p > 1) next.set("page", String(p));
    return `?${next.toString()}`;
  };

  return (
    <AccountSection
      title={t.title}
      lead={meta && meta.total ? rangeText(dict, meta.from, meta.to, meta.total, dict.nouns.order(meta.total)) : t.lead}
      action={
        <SelectField
          label={t.show}
          value={status ?? ""}
          onChange={(event) => setParams(event.target.value ? { status: event.target.value } : {})}
          containerClassName="w-48"
        >
          <option value="">{t.all}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {dict.orderStatus[s]}
            </option>
          ))}
        </SelectField>
      }
    >
      {orders.isError && !orders.data ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : orders.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={t.loading} className="grid gap-3">
            <SkeletonRow thumb="none" />
            <SkeletonRow thumb="none" />
            <SkeletonRow thumb="none" />
          </SkeletonGroup>
        ) : null
      ) : list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={status ? t.noneWithStatus : t.noneYet}
          description={status ? t.tryAnother : t.followHere}
          action={
            status ? (
              <Link to="/account/orders" className={buttonVariants({ variant: "outline" })}>
                {t.showAll}
              </Link>
            ) : (
              <Link to="/books" className={buttonVariants()}>
                {t.browse}
              </Link>
            )
          }
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul className={cn("account-orders-list", "grid gap-3", orders.isPlaceholderData && "opacity-60 transition-opacity")} aria-label={t.yours}>
          {list.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} className="mt-4" />
    </AccountSection>
  );
}
