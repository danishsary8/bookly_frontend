import { useEffect, useMemo, useState } from "react";
import { accountPage, useAccountPageBounds } from "@/features/account/pagination";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, Package, QrCode, Search, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { useSession } from "@/api/session";
import type { Customer, Order, OrderItem, OrderStatus } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { SelectField } from "@/components/form/Field";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { orderDate } from "@/features/orders/format";
import { getUnreadOrderIds, markOrdersSeen, readSeenOrderStatuses } from "@/features/orders/orderNotifications";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { cn } from "@/lib/utils";
import { formatMoney, formatUsd, useCurrency } from "@/stores/currency";
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

  const hiddenCount = items.length - visibleItems.length;
  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const showProgress = stepIndex >= 0;
  const showPayNow =
    order.payment_method === "khqr" &&
    order.payment_status === "pending" &&
    order.status === "pending" &&
    Boolean(order.payment_due_at);

  return (
    <li
      className={cn(
        "shop-card overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/45",
        isUpdated ? "border-primary/45 ring-1 ring-primary/15" : "border-border",
      )}
    >
      {/* Order header: number, status, updated pill, date, total & View order CTA */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-border/75 bg-surface-2/35 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            to={`/account/orders/${order.id}`}
            className="font-semibold tabular-nums text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {highlightMatch(order.order_number ?? `#${order.id}`, query)}
          </Link>
          <OrderStatusBadge status={order.status} />
          {isUpdated ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lapis-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              {t.newUpdate}
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground sm:text-sm">
            {orderDate(order.placed_at, locale)}
            {order.item_count ? ` · ${t.items(order.item_count)}` : null}
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {formatMoney(order.total_usd, order.total_khr, currency)}
          </span>
          <Link
            to={`/account/orders/${order.id}`}
            className="group inline-flex min-h-9 items-center gap-1 rounded-lg bg-lapis-tint/80 px-3 text-sm font-semibold text-primary transition-colors hover:bg-lapis-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.view}
            <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Product breakdown preview so customers recognize items & specs immediately */}
      {items.length > 0 ? (
        <div className="divide-y divide-border/60 px-4 sm:px-5">
          {visibleItems.map((item) => (
            <div key={item.id ?? `${item.book_id}-${item.title}`} className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary" aria-hidden="true">
                <BookOpen className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                {item.book_id ? (
                  <Link
                    to={`/books/${item.book_id}`}
                    className="block truncate text-[15px] font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {highlightMatch(item.title ?? "", query)}
                  </Link>
                ) : (
                  <span className="block truncate text-[15px] font-medium text-foreground">
                    {highlightMatch(item.title ?? "", query)}
                  </span>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground sm:text-[13px]">
                  {item.format ? (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-foreground/85">
                      {formatName(dict, item.format)}
                    </span>
                  ) : null}
                  {item.quantity ? <span className="tabular-nums font-medium">{t.qtyShort(item.quantity)}</span> : null}
                  {item.unit_price_usd ? <span className="tabular-nums">· {formatUsd(item.unit_price_usd)}</span> : null}
                </div>
              </div>
              {item.subtotal_usd ? (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground/90">
                  {formatUsd(item.subtotal_usd)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Footer strip: expand items toggle, quiet progress meter, KHQR pay-now action */}
      {hiddenCount > 0 || expanded || showProgress || showPayNow ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/60 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            {showProgress ? (
              <span className="flex w-36 gap-1" aria-hidden="true">
                {STEPS.map((step, i) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      i <= stepIndex ? (order.status === "delivered" || order.status === "shipped" ? "bg-success" : "bg-primary") : "bg-surface-2",
                    )}
                  />
                ))}
              </span>
            ) : null}

            {showPayNow && order.payment_due_at ? (
              <Link
                to={`/account/orders/${order.id}/pay`}
                className="inline-flex items-center gap-1.5 rounded-full bg-lapis-tint px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:text-sm"
              >
                <QrCode className="size-3.5" aria-hidden="true" />
                {t.payNow} · {t.payBy(new Date(order.payment_due_at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }))}
              </Link>
            ) : null}
          </div>

          {items.length > 2 && (!trimmedQuery || expanded) ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-lapis-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
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
          ) : null}
        </div>
      ) : null}
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
      action={
        <SelectField
          label={t.show}
          value={status ?? ""}
          onChange={(event) => setStatusFilter(isStatus(event.target.value) ? event.target.value : undefined)}
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
        <ul className={cn("account-orders-list", "grid gap-3.5", orders.isPlaceholderData && "opacity-60 transition-opacity")} aria-label={t.yours}>
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} query={search} isUpdated={order.id != null && highlightedIds.has(order.id)} />
          ))}
        </ul>
      )}
      {!isSearching ? <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} className="mt-4" /> : null}
    </AccountSection>
  );
}
