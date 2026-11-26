import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BookOpenText, ChevronRight, Package, PackageCheck, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { ebookQueries } from "@/api/endpoints/ebooks";
import { orderQueries } from "@/api/endpoints/orders";
import { useSession } from "@/api/session";
import type { Customer, Order } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AccountHubSections, AccountSignOut } from "@/features/account/AccountLayout";
import { AccountSection } from "@/features/account/AccountSection";
import { SecurityChecklist } from "@/features/account/SecurityChecklist";
import { StockAlertsCard } from "@/features/account/StockAlertsCard";
import { StoreCreditsCard } from "@/features/account/StoreCreditsCard";
import { isVerified } from "@/features/auth/verification";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Account overview:
 * - Desktop (>=1024px): Clean workspace right pane — header bar, side-by-side Spotlight row
 *   (Latest Order + dark lapis Continue Reading feature card), security checklist, recent orders,
 *   store credits, and stock alerts.
 * - Mobile (<1024px): Clean iOS/consumer-app hub — compact tappable Profile identity row, sleek
 *   dark lapis Continue Reading feature banner, compact Latest Order card, grouped white settings
 *   list cards with crisp hairlines, and Sign out card.
 */

function MobileProfileRow({ customer, verified }: { customer?: Customer | null; verified: boolean }) {
  const { dict } = useT();
  const initial = (customer?.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const subtitle = customer?.email || (verified ? dict.account.emailVerified : dict.account.profileLead);

  return (
    <Link to="/account/profile" className="account-mobile-profile-card">
      <span className="account-avatar-circle account-avatar-circle-lg" aria-hidden="true">
        {initial}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15.5px] font-semibold text-foreground">{customer?.name ?? dict.account.there}</span>
          {verified ? <BadgeCheck className="size-4 shrink-0 text-success" aria-hidden="true" /> : null}
        </span>
        <span className="truncate text-[13px] text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="account-list-chevron" aria-hidden="true" />
    </Link>
  );
}

function LatestOrderCard({ order }: { order: Order }) {
  const { dict, locale } = useT();
  const currency = useCurrency();
  const d = dict.dashboard;
  const awaitingKhqr = order.payment_method === "khqr" && order.payment_status === "pending" && order.status === "pending";
  const status = order.status ?? "pending";
  const action = awaitingKhqr
    ? { to: `/account/orders/${order.id}/pay`, label: dict.orders.payNow, cta: true }
    : status === "delivered"
      ? { to: order.items?.length === 1 && order.items[0].book_id ? `/books/${order.items[0].book_id}#your-review` : `/account/orders/${order.id}`, label: d.writeReview, cta: false }
      : { to: `/account/orders/${order.id}`, label: d.viewOrder, cta: false };

  return (
    <section aria-labelledby="latest-order" className="account-order-spotlight">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="account-order-badge" aria-hidden="true">
            <PackageCheck className="size-4" />
          </span>
          <h2 id="latest-order" className="account-order-kicker text-[11.5px] font-extrabold uppercase tracking-[0.13em]">
            {d.latestOrder}
          </h2>
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-1">
        <Link to={`/account/orders/${order.id}`} className="text-[17px] font-bold tracking-tight text-foreground tabular-nums underline-offset-4 hover:text-primary hover:underline sm:text-[19px]">
          {order.order_number}
        </Link>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {awaitingKhqr ? d.next.payKhqr : d.next[status]}
          {" · "}
          {orderDate(order.placed_at, locale)}
          {order.item_count ? ` · ${dict.orders.items(order.item_count)}` : null}
        </p>
      </div>

      <div className="account-order-spotlight-footer">
        <p className="font-sans text-[21px] font-bold tracking-tight tabular-nums text-foreground sm:text-[23px]">
          {formatMoney(order.total_usd, order.total_khr, currency)}
        </p>
        <Link
          to={action.to}
          className={cn(
            buttonVariants({ variant: action.cta ? "cta" : "default", size: "sm" }),
            "h-9 min-h-9 rounded-full px-4 text-[13px] font-semibold shadow-[0_6px_14px_-8px_rgb(20_32_122/0.45)]",
          )}
        >
          {action.label} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function ContinueReadingBanner() {
  const { dict } = useT();
  const d = dict.dashboard;
  const session = useSession<Customer>("customer");
  const verified = !session || isVerified(session.user);
  const library = useQuery({ ...ebookQueries.library(), enabled: verified });
  const ready = (library.data ?? []).filter((e) => e.status === "ready" && e.book.id);
  const latest = [...ready].sort((a, b) => (b.last_read_at ?? "").localeCompare(a.last_read_at ?? ""))[0];

  if (library.isPending && verified) {
    return (
      <section aria-hidden="true" className="account-feature-banner p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-14 w-10 shrink-0 rounded-md bg-white/15" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3 w-24 bg-white/15" />
            <Skeleton className="h-4 w-36 bg-white/20" />
            <Skeleton className="h-1.5 w-full bg-white/15" />
          </div>
        </div>
      </section>
    );
  }

  if (!latest || library.isError) {
    return (
      <section aria-labelledby="continue-reading-heading" className="account-feature-banner">
        <Link to="/account/ebooks" className="account-feature-banner-link group">
          <span className="account-feature-icon" aria-hidden="true">
            <BookOpenText className="size-5" />
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h2 id="continue-reading-heading" className="text-[14px] font-semibold text-white">
              {d.continueReading}
            </h2>
            <p className="line-clamp-2 text-[12.5px] leading-snug text-white/75">{d.startReadingLead}</p>
          </div>
          <span className="account-feature-pill">
            {dict.account.ebooks}
            <ChevronRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </span>
        </Link>
      </section>
    );
  }

  const page = latest.last_page ?? 1;
  const progress = latest.page_count ? Math.min(100, Math.round((page / latest.page_count) * 100)) : 0;

  return (
    <section aria-labelledby="continue-reading-heading" className="account-feature-banner">
      <Link to={`/read/${latest.book.id}`} state={{ from: "/account" }} className="account-feature-banner-link group">
        <span className="account-feature-cover">
          <BookCover src={latest.book.cover_image_url} title={latest.book.title ?? ""} />
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex items-center gap-2">
            <h2 id="continue-reading-heading" className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-gold">
              {d.continueReading}
            </h2>
            <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-white/90">{progress}%</span>
          </div>
          <p className="truncate text-[15px] font-semibold leading-tight text-white">{latest.book.title}</p>
          <div className="account-feature-bar" aria-hidden="true">
            <span className="account-feature-fill" style={{ transform: `scaleX(${Math.max(progress, 4) / 100})` }} />
          </div>
          <span className="text-[12px] tabular-nums text-white/75">{d.pageOf(page, latest.page_count)}</span>
        </div>
        <span className="account-feature-pill">
          {dict.ebook.readNow}
          <ChevronRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}

function RecentOrder({ order }: { order: Order }) {
  const currency = useCurrency();
  const { dict, locale } = useT();
  return (
    <li className="border-t border-border/70 first:border-t-0">
      <Link
        to={`/account/orders/${order.id}`}
        className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3.5 outline-none transition-colors duration-150 hover:bg-surface-2/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[14.5px] font-semibold tabular-nums text-foreground transition-colors group-hover:text-primary">{order.order_number}</span>
          <span className="text-xs text-muted-foreground">
            {orderDate(order.placed_at, locale)}
            {order.item_count ? ` · ${dict.orders.items(order.item_count)}` : null}
          </span>
        </span>
        <span className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <OrderStatusBadge status={order.status} />
          <span className="flex items-center gap-2">
            <span className="min-w-14 text-right text-sm font-semibold tabular-nums text-foreground">{formatMoney(order.total_usd, order.total_khr, currency)}</span>
            <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function AccountOverviewPage() {
  const { dict, locale } = useT();
  const a = dict.account;
  useDocumentTitle(a.docTitle);
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  // Share the exact same query key as AccountLayout's useOrderNotifications so Latest Order renders without a duplicate /orders fetch.
  const orders = useQuery(orderQueries.orders({ page: 1, per_page: 20 }));
  const customer = me.data ?? session?.user;
  const verified = isVerified(customer);
  const firstName = customer?.name?.split(" ")[0] ?? a.there;
  const memberSince = customer?.created_at ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(customer.created_at)) : null;
  const [latest, ...restOrders] = orders.data?.data ?? [];
  const older = restOrders.slice(0, 3);

  return (
    <AccountSection
      hideMobileHeader
      title={a.hello(firstName)}
      lead={
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-semibold text-success">
              <BadgeCheck className="size-3.5" aria-hidden="true" /> {customer?.email_verified ? a.emailVerified : a.phoneVerified}
            </span>
          ) : null}
          {memberSince ? <span className="text-[13px] text-muted-foreground">{a.memberSince(memberSince)}</span> : null}
        </div>
      }
      action={
        <Link to="/account/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 min-h-9 rounded-lg px-3.5 text-[13px]")}>
          {a.editProfile}
        </Link>
      }
    >
      {/* Mobile-only compact tappable identity row (iOS/consumer app Profile hub header). */}
      <MobileProfileRow customer={customer} verified={verified} />

      {/* Spotlight row: dark lapis Continue Reading feature card + clean Latest Order card. */}
      <div className="account-spotlight-row" data-spotlight="true">
        <ContinueReadingBanner />
        {orders.isPending ? (
          <SkeletonGroup label={a.loadingOrders} className="account-order-spotlight">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-7 rounded-lg" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid gap-1.5">
              <Skeleton className="h-5 w-44 max-w-full rounded-md" />
              <Skeleton className="h-3.5 w-60 max-w-full rounded-full" />
            </div>
            <div className="account-order-spotlight-footer">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </SkeletonGroup>
        ) : orders.isError ? (
          <InlineError error={orders.error} onRetry={() => orders.refetch()} />
        ) : latest ? (
          <LatestOrderCard order={latest} />
        ) : (
          <div className="account-order-spotlight items-center justify-center text-center">
            <EmptyState
              icon={Package}
              headingLevel="h2"
              title={a.noOrdersYet}
              description={a.noOrdersLead}
              action={
                <Link to="/books" className={cn(buttonVariants({ variant: "default", size: "sm" }), "rounded-full px-5")}>
                  {a.browseBooks}
                </Link>
              }
              className="py-4"
            />
          </div>
        )}
      </div>

      {/* Mobile grouped white settings list cards (hidden on desktop where the persistent sidebar lives). */}
      <AccountHubSections />

      <SecurityChecklist />

      {older.length > 0 ? (
        <section aria-labelledby="recent-orders" className="account-recent-card overflow-hidden">
          <div className="account-recent-header flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="account-recent-icon" aria-hidden="true">
                <ReceiptText className="size-4" />
              </span>
              <h2 id="recent-orders" className="text-[15.5px] font-bold tracking-tight text-foreground">
                {a.recentOrders}
              </h2>
            </div>
            <Link
              to="/account/orders"
              className="inline-flex min-h-8 items-center gap-1 rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success transition-colors hover:bg-success hover:text-success-foreground"
            >
              {a.seeAllOrders}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {older.map((order) => (
              <RecentOrder key={order.id} order={order} />
            ))}
          </ul>
        </section>
      ) : null}

      <StoreCreditsCard />
      <StockAlertsCard />
      <AccountSignOut />
    </AccountSection>
  );
}
