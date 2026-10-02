import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package } from "lucide-react";
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
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";

const PER_PAGE = 10;
const STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];
const isStatus = (value: string | null): value is OrderStatus => STATUSES.some((s) => s.value === value);

function OrderRow({ order }: { order: Order }) {
  const currency = useCurrency();
  const titles = (order.items ?? []).map((item) => item.title).filter(Boolean);
  const more = titles.length > 2 ? ` and ${titles.length - 2} more` : "";
  return (
    <li>
      <Link
        to={`/account/orders/${order.id}`}
        className="group grid gap-3 rounded-xl border border-border bg-card p-4 outline-none transition-colors duration-150 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
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
            {orderDate(order.placed_at)}
            {order.item_count ? ` · ${order.item_count} ${order.item_count === 1 ? "item" : "items"}` : null}
          </span>
        </span>
        <span className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="font-semibold tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            View order <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
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
  useDocumentTitle("Your orders");
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const statusParam = params.get("status");
  const status = isStatus(statusParam) ? statusParam : undefined;
  const orders = useQuery({ ...orderQueries.orders({ page, per_page: PER_PAGE, status }), placeholderData: (previous) => previous });
  const showSkeleton = useSkeletonVisible(orders.isPending);
  const meta = orders.data?.meta;
  const list = orders.data?.data ?? [];

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (p > 1) next.set("page", String(p));
    return `?${next.toString()}`;
  };

  return (
    <AccountSection
      title="Orders"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "order" : "orders") : "Follow your orders, cancel, or ask for a return."}
      action={
        <SelectField
          label="Show"
          value={status ?? ""}
          onChange={(event) => setParams(event.target.value ? { status: event.target.value } : {})}
          containerClassName="w-48"
        >
          <option value="">All orders</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectField>
      }
    >
      {orders.isError && !orders.data ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : orders.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label="Loading orders…" className="grid gap-3">
            <SkeletonRow thumb="none" />
            <SkeletonRow thumb="none" />
            <SkeletonRow thumb="none" />
          </SkeletonGroup>
        ) : null
      ) : list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={status ? "No orders with this status" : "No orders yet"}
          description={status ? "Try another status, or show all orders." : "When you place an order, you can follow it here."}
          action={
            status ? (
              <Link to="/account/orders" className={buttonVariants({ variant: "outline" })}>
                Show all orders
              </Link>
            ) : (
              <Link to="/books" className={buttonVariants()}>
                Browse books
              </Link>
            )
          }
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul className={cn("grid gap-3", orders.isPlaceholderData && "opacity-60 transition-opacity")} aria-label="Your orders">
          {list.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} className="mt-4" />
    </AccountSection>
  );
}
