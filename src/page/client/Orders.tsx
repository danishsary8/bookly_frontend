import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PackageSearch, ReceiptText, Search } from "lucide-react";
import customerService from "../../services/customer.service";
import type { CustomerInvoice } from "../../types/customer.types";
import { formatOrderDate, formatPrice, toNumber } from "../../lib/format";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import CountUp from "../../components/CountUp";
import SpotlightCard from "../../components/SpotlightCard";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/EmptyState";
import { OrderStatusBadge } from "../../components/OrderStatus";
import { controlClassName } from "../../components/form/Field";
import { cn } from "@/lib/utils";

/* /orders: the customer's order history (GET /invoices), restyled from the old Invoices page. */

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

const OPEN: CustomerInvoice["status"][] = ["pending", "paid", "processing", "shipped"];

const Orders = () => {
  const [orders, setOrders] = useState<CustomerInvoice[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const showSkeleton = useSkeletonVisible(!orders && !loadError);

  useEffect(() => {
    let active = true;
    customerService
      .getInvoices()
      .then((data) => active && setOrders([...data].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))))
      .catch(() => active && setLoadError(true));
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const list = orders ?? [];
    return {
      total: list.length,
      open: list.filter((o) => OPEN.includes(o.status)).length,
      delivered: list.filter((o) => o.status === "delivered").length,
      spent: list.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + toNumber(o.total), 0),
    };
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders ?? []).filter((order) => {
      const inFilter = filter === "all" ? true : filter === "open" ? OPEN.includes(order.status) : order.status === filter;
      const inSearch = !q || order.id.toLowerCase().includes(q) || order.items.some((item) => item.title.toLowerCase().includes(q));
      return inFilter && inSearch;
    });
  }, [orders, filter, query]);

  const header = (
    <header className="mb-8">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Your orders</h1>
    </header>
  );

  if (loadError) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        <EmptyState icon={ReceiptText} title="Your orders didn't load" description="Check your connection and try again." action={<Button onClick={() => window.location.reload()}>Try again</Button>} />
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        {showSkeleton ? (
          <div aria-busy="true" className="grid gap-4">
            <span className="sr-only">Loading your orders…</span>
            <div aria-hidden="true" className="skeleton h-24 rounded-xl" />
            {[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="skeleton h-28 rounded-xl" />)}
          </div>
        ) : null}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        <EmptyState icon={ReceiptText} title="No orders yet" description="When you check out, your orders and their delivery progress show up here." action={<Button asChild><Link to="/browse">Browse books</Link></Button>} />
      </div>
    );
  }

  return (
    <div className="section-wrap py-8 lg:py-12">
      {header}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
        {[
          { label: "Orders", value: summary.total },
          { label: "Open", value: summary.open },
          { label: "Delivered", value: summary.delivered },
        ].map((stat) => (
          <div key={stat.label} className="bg-card p-5">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</dt>
            <dd className="mt-2 font-display text-[1.75rem] leading-none tabular-nums text-primary"><CountUp to={stat.value} duration={1.2} /></dd>
          </div>
        ))}
        <div className="bg-card p-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Spent</dt>
          <dd className="mt-2 font-display text-[1.75rem] leading-none tabular-nums text-primary">{formatPrice(summary.spent)}</dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter orders" className="inline-flex w-max rounded-lg border border-input bg-card p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "min-h-11 rounded-md px-4 text-sm font-semibold transition-[background-color,color,scale] duration-150 active:scale-95 motion-reduce:active:scale-100",
                filter === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative md:w-80">
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input id="order-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order number or book title" className={cn(controlClassName, "h-11 pl-10")} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{visible.length} {visible.length === 1 ? "order" : "orders"} shown</p>

      {visible.length === 0 ? (
        <EmptyState icon={PackageSearch} headingLevel="h2" title="No orders match" description="Try a different filter, or search by order number or book title." action={<Button variant="outline" onClick={() => { setFilter("all"); setQuery(""); }}>Clear filters</Button>} />
      ) : (
        <ul className="mt-6 grid gap-4">
          {visible.map((order) => {
            const count = order.items.reduce((n, item) => n + toNumber(item.quantity), 0);
            const titles = order.items.map((item) => item.title);
            return (
              <li key={order.id}>
                <SpotlightCard className="group rounded-xl border-border bg-card p-0 transition-[box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.995] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100">
                  <Link to={`/orders/${encodeURIComponent(order.id)}`} className="relative z-10 grid gap-4 rounded-xl p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-sans text-base font-semibold tabular-nums text-foreground">{order.id}</h2>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatOrderDate(order.createdAt)} · {count} {count === 1 ? "book" : "books"} · {order.paymentMethod === "card" ? "Card" : "Cash on delivery"}
                      </p>
                      <p className="mt-2 truncate text-sm text-foreground">
                        {titles.slice(0, 2).join(", ")}
                        {titles.length > 2 ? <span className="text-muted-foreground"> and {titles.length - 2} more</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="text-lg font-semibold tabular-nums text-foreground">{formatPrice(order.total)}</p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        View order
                        <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </SpotlightCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Orders;
