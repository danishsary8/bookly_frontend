import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BookOpen, Heart, KeyRound, MapPin, Package, TicketPercent, TrendingDown, UserRound, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { ebookQueries } from "@/api/endpoints/ebooks";
import { orderQueries } from "@/api/endpoints/orders";
import { rewardQueries } from "@/api/endpoints/rewards";
import { useSession } from "@/api/session";
import type { Customer, Order } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { priceDropSince } from "@/features/account/priceDrop";
import { StockAlertsCard } from "@/features/account/StockAlertsCard";
import { StoreCreditsCard } from "@/features/account/StoreCreditsCard";
import { isVerified } from "@/features/auth/verification";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Account overview (pages/account.md §3): a dashboard, not a menu. First the latest order and its one next step (pay
 * by KHQR, follow it, or review it), then three live tiles (coupons ready, price drops on saved books, the ebook to
 * continue), quick links, store credit, stock alerts and the recent orders. Every figure comes from the API and
 * shows a skeleton until its request answers.
 */

const card = "shop-card rounded-2xl border border-border bg-card";

function LatestOrder({ order }: { order: Order }) {
  const { dict, locale } = useT();
  const currency = useCurrency();
  const d = dict.dashboard;
  const awaitingKhqr = order.payment_method === "khqr" && order.payment_status === "pending" && order.status === "pending";
  const status = order.status ?? "pending";
  const action = awaitingKhqr
    ? { to: `/account/orders/${order.id}/pay`, label: dict.orders.payNow, cta: true }
    : status === "delivered"
      ? { to: "/account/reviews", label: d.writeReview, cta: false }
      : { to: `/account/orders/${order.id}`, label: d.viewOrder, cta: false };
  return (
    <section aria-labelledby="latest-order" className={cn(card, "relative isolate overflow-hidden p-5 sm:p-6")}>
      <span className="pointer-events-none absolute -right-12 -top-20 -z-10 size-56 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_12%,transparent),transparent)]" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1">
          <h2 id="latest-order" className="font-sans text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {d.latestOrder}
          </h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to={`/account/orders/${order.id}`} className="font-display text-[1.75rem] leading-tight tabular-nums underline-offset-4 hover:underline">
              {order.order_number}
            </Link>
            <OrderStatusBadge status={order.status} />
          </p>
          <p className="text-muted-foreground">
            {awaitingKhqr ? d.next.payKhqr : d.next[status]}
            {" · "}
            {orderDate(order.placed_at, locale)}
            {order.item_count ? ` · ${dict.orders.items(order.item_count)}` : null}
          </p>
        </div>
        <div className="grid justify-items-start gap-2 sm:justify-items-end">
          <p className="font-display text-[1.75rem] leading-none tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</p>
          <Link to={action.to} className={buttonVariants({ variant: action.cta ? "cta" : "outline" })}>
            {action.label} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Tile({ to, Icon, title, children, loading }: { to: string; Icon: LucideIcon; title: string; children: ReactNode; loading?: boolean }) {
  return (
    <li>
      <Link to={to} className={cn(card, "group flex h-full gap-4 p-4 outline-none transition-[border-color,translate] duration-150 hover:-translate-y-0.5 hover:border-input focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0")}>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="grid min-w-0 flex-1 content-start gap-0.5">
          <span className="font-semibold">{title}</span>
          {loading ? <span className="skeleton mt-1 block h-4 w-3/4 rounded-sm" aria-hidden="true" /> : <span className="text-sm text-muted-foreground">{children}</span>}
        </span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
      </Link>
    </li>
  );
}

function ContinueReading() {
  const { dict } = useT();
  const d = dict.dashboard;
  const library = useQuery(ebookQueries.library());
  const ready = (library.data ?? []).filter((e) => e.status === "ready" && e.book.id);
  const latest = [...ready].sort((a, b) => (b.last_read_at ?? "").localeCompare(a.last_read_at ?? ""))[0];
  if (library.isPending) return <Tile to="/account/ebooks" Icon={BookOpen} title={d.continueReading} loading>{null}</Tile>;
  if (!latest) return <Tile to="/account/ebooks" Icon={BookOpen} title={d.startReading}>{d.startReadingLead}</Tile>;
  const page = latest.last_page ?? 1;
  const progress = latest.page_count ? Math.min(100, Math.round((page / latest.page_count) * 100)) : 0;
  return (
    <li>
      <Link to={`/read/${latest.book.id}`} className={cn(card, "group flex h-full gap-4 p-4 outline-none transition-[border-color,translate] duration-150 hover:-translate-y-0.5 hover:border-input focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0")}>
        <span className="w-11 shrink-0 overflow-hidden rounded-sm shadow-sm">
          <BookCover src={latest.book.cover_image_url} title={latest.book.title ?? ""} />
        </span>
        <span className="grid min-w-0 flex-1 content-start gap-1">
          <span className="font-semibold">{d.continueReading}</span>
          <span className="truncate text-sm text-muted-foreground">{latest.book.title}</span>
          <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <span className="block h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${progress / 100})` }} />
          </span>
          <span className="text-xs text-muted-foreground">{d.pageOf(page, latest.page_count)}</span>
        </span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
      </Link>
    </li>
  );
}

function RecentOrder({ order }: { order: Order }) {
  const currency = useCurrency();
  const { dict, locale } = useT();
  return (
    <li className="border-t border-border first:border-t-0">
      <Link
        to={`/account/orders/${order.id}`}
        className="group -mx-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl px-3 py-4 outline-none transition-colors duration-150 hover:bg-surface-2/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid gap-0.5">
          <span className="font-semibold tabular-nums">{order.order_number}</span>
          <span className="text-sm text-muted-foreground">
            {orderDate(order.placed_at, locale)}
            {order.item_count ? ` · ${dict.orders.items(order.item_count)}` : null}
          </span>
        </span>
        <span className="flex items-center gap-4">
          <OrderStatusBadge status={order.status} />
          <span className="min-w-20 text-right font-semibold tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</span>
          <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

export default function AccountOverviewPage() {
  const { dict, locale } = useT();
  const a = dict.account;
  const d = dict.dashboard;
  useDocumentTitle(a.docTitle);
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  const orders = useQuery(orderQueries.orders({ per_page: 4 }));
  const addresses = useQuery(accountQueries.addresses());
  // The same page of saved books the catalogue's hearts use, so it is usually cached already.
  const wishlist = useQuery(accountQueries.wishlist({ per_page: 100 }));
  const coupons = useQuery(rewardQueries.myCoupons());
  const customer = me.data ?? session?.user;
  const firstName = customer?.name?.split(" ")[0] ?? a.there;
  const memberSince = customer?.created_at ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(customer.created_at)) : null;
  const usable = (coupons.data ?? []).filter((c) => c.is_usable).length;
  const drops = (wishlist.data?.data ?? []).filter((b) => priceDropSince(b)).length;
  const [latest, ...older] = orders.data?.data ?? [];

  const quick = [
    { to: "/account/profile", label: a.profile, Icon: UserRound },
    { to: "/account/addresses", label: addresses.data ? `${a.addresses} · ${addresses.data.length}` : a.addresses, Icon: MapPin },
    { to: "/account/wishlist", label: wishlist.data ? `${a.wishlist} · ${wishlist.data.meta?.total ?? 0}` : a.wishlist, Icon: Heart },
    { to: "/account/security", label: a.security, Icon: KeyRound },
  ];

  return (
    <AccountSection
      title={a.hello(firstName)}
      lead={
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {isVerified(customer) ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <BadgeCheck className="size-4" aria-hidden="true" /> {customer?.email_verified ? a.emailVerified : a.phoneVerified}
            </span>
          ) : null}
          {memberSince ? <span>{a.memberSince(memberSince)}</span> : null}
        </p>
      }
    >
      {orders.isPending ? (
        <SkeletonGroup label={a.loadingOrders} className={cn(card, "grid gap-3 p-6")}>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </SkeletonGroup>
      ) : orders.isError ? (
        <InlineError error={orders.error} onRetry={() => orders.refetch()} />
      ) : latest ? (
        <LatestOrder order={latest} />
      ) : (
        <div className={card}>
          <EmptyState
            icon={Package}
            headingLevel="h2"
            title={a.noOrdersYet}
            description={a.noOrdersLead}
            action={
              <Link to="/books" className={buttonVariants({ variant: "cta" })}>
                {a.browseBooks}
              </Link>
            }
            className="py-8"
          />
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-3">
        <Tile to="/account/coupons" Icon={TicketPercent} title={d.couponsReady} loading={coupons.isPending}>
          {d.couponsLead(usable)}
        </Tile>
        <Tile to="/account/wishlist" Icon={TrendingDown} title={d.priceDrops} loading={wishlist.isPending}>
          {d.priceDropsLead(drops)}
        </Tile>
        <ContinueReading />
      </ul>

      <nav aria-label={d.quickLinks} className="lg:hidden">
        <ul className="flex flex-wrap gap-2">
          {quick.map(({ to, label, Icon }) => (
            <li key={to}>
              <Link to={to} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium outline-none transition-colors hover:border-primary/40 hover:bg-lapis-tint hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <StoreCreditsCard />
      <StockAlertsCard />

      {older.length > 0 ? (
        <section aria-labelledby="recent-orders" className={cn(card, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="recent-orders" className="font-display text-[1.563rem] leading-tight">
              {a.recentOrders}
            </h2>
            <Link to="/account/orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
              {a.seeAllOrders}
            </Link>
          </div>
          <ul className="mt-2">
            {older.map((order) => (
              <RecentOrder key={order.id} order={order} />
            ))}
          </ul>
        </section>
      ) : null}
    </AccountSection>
  );
}
