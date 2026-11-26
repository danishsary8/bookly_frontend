import { useEffect, useMemo, useState } from "react";
import { accountPage, useAccountPageBounds } from "@/features/account/pagination";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, Clock, Package, PackageCheck, QrCode, RotateCcw, Search, Star, Truck, X, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { useSession } from "@/api/session";
import type { Customer, Order, OrderItem, OrderStatus } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { orderDate } from "@/features/orders/format";
import { getUnreadOrderIds, markOrdersSeen, readSeenOrderStatuses } from "@/features/orders/orderNotifications";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { formatName, rangeText, useT, type Translations } from "@/i18n";

const PER_PAGE = 10;
const SEARCH_PER_PAGE = 50;
const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled", "returned"];
const isStatus = (value: string | null): value is OrderStatus => STATUSES.some((s) => s === value);

/* Where an order is on its way (MASTER §6.3a timeline steps), as a quiet five-segment meter; the badge says it in words. */
const STEPS = ["pending", "paid", "processing", "shipped", "delivered"] as const;

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-xs bg-warning-tint px-0.5 text-foreground">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function itemMatches(item: OrderItem, q: string, dict: Translations) {
  const title = (item.title ?? "").toLowerCase();
  const fmt = (item.format ?? "").toLowerCase();
  const fmtLocal = formatName(dict, item.format).toLowerCase();
  return title.includes(q) || fmt.includes(q) || fmtLocal.includes(q);
}

function orderMatches(order: Order, rawQuery: string, dict: Translations) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  if ((order.order_number ?? "").toLowerCase().includes(q)) return true;
  if (order.status) {
    if (order.status.toLowerCase().includes(q)) return true;
    if ((dict.orderStatus[order.status] ?? "").toLowerCase().includes(q)) return true;
  }
  if ((order.shipping_address?.recipient_name ?? "").toLowerCase().includes(q)) return true;
  if ((order.shipping_address?.city ?? "").toLowerCase().includes(q)) return true;
  return (order.items ?? []).some((item) => itemMatches(item, q, dict));
}

function OrderRow({ order, query, isUpdated }: { order: Order; query: string; isUpdated: boolean }) {
  const currency = useCurrency();
  const { dict, locale } = useT();
  const t = dict.orders;
  const [expanded, setExpanded] = useState(false);

  const items = order.items ?? [];
  const trimmedQuery = query.trim().toLowerCase();
  const visibleItems = (() => {
    if (expanded || items.length <= 2) return items;
    if (trimmedQuery) {
      const matched = items.filter((item) => itemMatches(item, trimmedQuery, dict));
      if (matched.length > 0) return matched;
    }
    return items.slice(0, 2);
  })();

  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const showProgress = stepIndex >= 0;
  const delivered = order.status === "delivered";
  const rateNum =
    Number(order.total_usd) > 0 && Number(order.total_khr) > 0
      ? Number(order.total_khr) / Number(order.total_usd)
      : 4100;
  const toKhrApprox = (usdStr: string | null | undefined) =>
    usdStr ? String(Math.round((Number(usdStr) * rateNum) / 100) * 100) : null;
  const showPayNow =
    order.payment_method === "khqr" &&
    order.payment_status === "pending" &&
    order.status === "pending" &&
    Boolean(order.payment_due_at);

  const statusTone = (() => {
    switch (order.status) {
      case "delivered":
        return {
          topBar: "border-t-success",
          headerBg: "bg-gradient-to-r from-success-tint/70 via-card to-card",
          iconBox: "bg-success-tint text-success ring-1 ring-success/20",
          Icon: PackageCheck,
        };
      case "shipped":
        return {
          topBar: "border-t-success",
          headerBg: "bg-gradient-to-r from-success-tint/55 via-card to-card",
          iconBox: "bg-success-tint text-success ring-1 ring-success/20",
          Icon: Truck,
        };
      case "paid":
      case "processing":
        return {
          topBar: "border-t-primary",
          headerBg: "bg-gradient-to-r from-lapis-tint/65 via-card to-card",
          iconBox: "bg-lapis-tint text-primary ring-1 ring-primary/15",
          Icon: Package,
        };
      case "cancelled":
        return {
          topBar: "border-t-destructive/75",
          headerBg: "bg-gradient-to-r from-destructive-tint/60 via-card to-card",
          iconBox: "bg-destructive-tint text-destructive ring-1 ring-destructive/20",
          Icon: XCircle,
        };
      case "returned":
        return {
          topBar: "border-t-muted-foreground/55",
          headerBg: "bg-gradient-to-r from-surface-2/85 via-card to-card",
          iconBox: "bg-surface-2 text-muted-foreground ring-1 ring-border",
          Icon: RotateCcw,
        };
      default:
        return {
          topBar: "border-t-[#D97706] dark:border-t-gold",
          headerBg: "bg-gradient-to-r from-warning-tint/75 via-card to-card",
          iconBox: "bg-warning-tint text-warning ring-1 ring-warning/25",
          Icon: Clock,
        };
    }
  })();
  const StatusIcon = statusTone.Icon;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border border-t-[3.5px] bg-card shadow-[0_10px_28px_-18px_rgb(14_19_53/0.24),0_2px_6px_-2px_rgb(14_19_53/0.06)] transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-[0_16px_34px_-18px_rgb(20_32_122/0.3)]",
        statusTone.topBar,
        isUpdated ? "border-primary/50 ring-2 ring-primary/15" : "border-border/95",
      )}
    >
      {/* Zone 1: Status-tinted order header band */}
      <div className={cn("flex items-start justify-between gap-3 border-b border-border/75 px-4 py-3.5 sm:px-5", statusTone.headerBg)}>
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl", statusTone.iconBox)} aria-hidden="true">
            <StatusIcon className="size-[19px]" />
          </span>
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/account/orders/${order.id}`}
                className="truncate text-[15.5px] font-bold tracking-tight tabular-nums text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base"
              >
                {highlightMatch(order.order_number ?? `#${order.id}`, query)}
              </Link>
              {isUpdated ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-lapis-tint px-2 py-0.5 text-[11px] font-bold text-primary ring-1 ring-primary/20">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                  {t.newUpdate}
                </span>
              ) : null}
            </div>
            <p className="text-xs font-medium text-muted-foreground sm:text-[13px]">
              {orderDate(order.placed_at, locale)}
              {order.item_count ? ` · ${t.items(order.item_count)}` : null}
            </p>
          </div>
        </div>

        <div className="shrink-0 pt-0.5">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Zone 2: Clean item breakdown */}
      {items.length > 0 ? (
        <div className="divide-y divide-border/60 px-4 sm:px-5">
          {visibleItems.map((item) => (
            <div key={item.id ?? `${item.book_id}-${item.title}`} className="flex items-center gap-3 py-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lapis-tint/55 text-primary ring-1 ring-primary/10" aria-hidden="true">
                <BookOpen className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                {item.book_id ? (
                  <Link
                    to={`/books/${item.book_id}`}
                    className="block truncate text-[14.5px] font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[15px]"
                  >
                    {highlightMatch(item.title ?? "", query)}
                  </Link>
                ) : (
                  <span className="block truncate text-[14.5px] font-semibold text-foreground sm:text-[15px]">
                    {highlightMatch(item.title ?? "", query)}
                  </span>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-[13px]">
                  {item.format ? (
                    <span className="rounded-md border border-border/75 bg-surface-2/80 px-2 py-0.5 text-[11.5px] font-semibold text-foreground/85">
                      {formatName(dict, item.format)}
                    </span>
                  ) : null}
                  {item.quantity ? <span className="tabular-nums font-semibold text-foreground/75">{t.qtyShort(item.quantity)}</span> : null}
                  {item.unit_price_usd ? <span className="tabular-nums">· {formatMoney(item.unit_price_usd, toKhrApprox(item.unit_price_usd), currency)}</span> : null}
                  {delivered && item.book_id ? (
                    <Link
                      to={`/books/${item.book_id}#your-review`}
                      className="inline-flex items-center gap-1 rounded-full bg-lapis-tint/75 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-lapis-tint"
                    >
                      <Star className="size-3 fill-gold text-gold" aria-hidden="true" />
                      {t.reviewBook}
                    </Link>
                  ) : null}
                </div>
              </div>
              {item.subtotal_usd ? (
                <span className="shrink-0 text-[14.5px] font-bold tabular-nums text-foreground">
                  {formatMoney(item.subtotal_usd, toKhrApprox(item.subtotal_usd), currency)}
                </span>
              ) : null}
            </div>
          ))}

          {items.length > 2 && (!trimmedQuery || expanded) ? (
            <div className="py-2">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-lapis-tint/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[13px]"
              >
                {expanded ? (
                  <>
                    {t.showFewerItems} <ChevronUp className="size-3.5" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    {t.showAllItems(items.length)} <ChevronDown className="size-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Zone 3: Crisp footer with total, progress segments, KHQR Pay Now, and View order pill */}
      <div className="grid gap-2.5 border-t border-dashed border-border/90 bg-surface-2/30 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{dict.checkoutPage.total}</span>
              <span className="text-lg font-bold tracking-tight tabular-nums text-foreground">
                {formatMoney(order.total_usd, order.total_khr, currency)}
              </span>
            </div>
            {showProgress ? (
              <span className="flex w-36 gap-1.5" aria-hidden="true">
                {STEPS.map((step, i) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i <= stepIndex ? (order.status === "delivered" || order.status === "shipped" ? "bg-success" : "bg-primary") : "bg-border/80",
                    )}
                  />
                ))}
              </span>
            ) : null}
          </div>

          <Link
            to={`/account/orders/${order.id}`}
            className="group inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground shadow-[0_6px_14px_-8px_rgb(20_32_122/0.55)] transition-[filter,transform] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t.view}
            <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        </div>

        {showPayNow && order.payment_due_at ? (
          <div>
            <Link
              to={`/account/orders/${order.id}/pay`}
              className="inline-flex items-center gap-1.5 rounded-full bg-warning-tint px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-warning/35 transition-colors hover:bg-primary hover:text-primary-foreground hover:ring-primary sm:text-[13px]"
            >
              <QrCode className="size-3.5" aria-hidden="true" />
              {t.payNow} · {t.payAutoCancelBy(new Date(order.payment_due_at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }))}
            </Link>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/*
 * /account/orders: the customer's orders, newest first, with quick search,
 * status filter pills + accessible select, and product breakdown previews.
 * Page and status live in the URL so Back and shared links keep them.
 */
export default function OrdersPage() {
  const { dict } = useT();
  const t = dict.orders;
  useDocumentTitle(t.docTitle);
  const session = useSession<Customer>("customer");
  const customerId = session?.user?.id;
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  // Snapshot what was seen before arriving on this page so newly updated orders stay highlighted during this visit.
  const [seenSnapshot] = useState(() => (customerId ? readSeenOrderStatuses(customerId) : null));

  const page = accountPage(params.get("page"));
  const statusParam = params.get("status");
  const status = isStatus(statusParam) ? statusParam : undefined;
  const isSearching = search.trim().length > 0;

  const orders = useQuery({
    ...orderQueries.orders({
      page: isSearching ? 1 : page,
      per_page: isSearching ? SEARCH_PER_PAGE : PER_PAGE,
      status,
    }),
    placeholderData: (previous) => previous,
  });
  const showSkeleton = useSkeletonVisible(orders.isPending);
  const meta = orders.data?.meta;
  useAccountPageBounds(meta, orders.isPlaceholderData || isSearching);
  const list = useMemo(() => orders.data?.data ?? [], [orders.data?.data]);

  const highlightedIds = useMemo(
    () => (customerId ? getUnreadOrderIds(list, seenSnapshot) : new Set<number>()),
    [customerId, list, seenSnapshot],
  );

  // Sync loaded orders to the seen-status store so the nav notification count clears immediately on check.
  useEffect(() => {
    if (customerId && list.length > 0) markOrdersSeen(customerId, list);
  }, [customerId, list]);

  const filtered = useMemo(
    () => (isSearching ? list.filter((order) => orderMatches(order, search, dict)) : list),
    [isSearching, list, search, dict],
  );

  const setStatusFilter = (nextStatus?: OrderStatus) => {
    setParams(nextStatus ? { status: nextStatus } : {});
  };

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (p > 1) next.set("page", String(p));
    return `?${next.toString()}`;
  };

  return (
    <AccountSection
      title={t.title}
      lead={
        isSearching && list.length > 0
          ? t.matchingCount(filtered.length, list.length)
          : meta && meta.total
            ? rangeText(dict, meta.from, meta.to, meta.total, dict.nouns.order(meta.total))
            : t.lead
      }
    >
      {/* Search + 1-click status filter pills */}
      <div className="mb-5 grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t.clearSearch}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div role="group" aria-label={t.filterByStatus} className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setStatusFilter(undefined)}
            aria-pressed={!status}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !status
                ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t.all}
          </button>
          {STATUSES.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(active ? undefined : s)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {dict.orderStatus[s]}
              </button>
            );
          })}
        </div>
      </div>

      {orders.isError && !orders.data ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : orders.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={t.loading} className="grid gap-4 sm:gap-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-start justify-between gap-3 border-b border-border/75 bg-surface-2/30 px-4 py-3.5 sm:px-5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-xl" />
                    <div className="grid gap-1.5 pt-0.5">
                      <Skeleton className="h-4 w-36 rounded-md" />
                      <Skeleton className="h-3 w-28 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="grid flex-1 gap-1.5">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3.5 w-1/3 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-14 shrink-0 rounded-md" />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-dashed border-border/80 bg-surface-2/25 px-4 py-3.5 sm:px-5">
                  <div className="grid gap-2">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <Skeleton className="h-1.5 w-36 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-28 shrink-0 rounded-full" />
                </div>
              </div>
            ))}
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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t.noMatches}
          description={t.noMatchesLead(search.trim())}
          action={
            <Button variant="outline" onClick={() => setSearch("")}>
              {t.clearSearch}
            </Button>
          }
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul className={cn("account-orders-list", "grid gap-4 sm:gap-5", orders.isPlaceholderData && "opacity-60 transition-opacity")} aria-label={t.yours}>
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} query={search} isUpdated={order.id != null && highlightedIds.has(order.id)} />
          ))}
        </ul>
      )}
      {!isSearching ? <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} className="mt-4" /> : null}
    </AccountSection>
  );
}
