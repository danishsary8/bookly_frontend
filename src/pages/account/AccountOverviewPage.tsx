import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Heart, KeyRound, MapPin, Package, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { orderQueries } from "@/api/endpoints/orders";
import { useSession } from "@/api/session";
import type { Customer, Order } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatMoney, useCurrency } from "@/stores/currency";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function RecentOrder({ order }: { order: Order }) {
  const currency = useCurrency();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border py-4 first:border-t-0">
      <div className="grid gap-0.5">
        <p className="font-semibold tabular-nums">{order.order_number}</p>
        <p className="text-sm text-muted-foreground">
          {order.placed_at ? dateFormat.format(new Date(order.placed_at)) : null}
          {order.item_count ? ` · ${order.item_count} ${order.item_count === 1 ? "item" : "items"}` : null}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <OrderStatusBadge status={order.status} />
        <p className="min-w-20 text-right font-semibold tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</p>
      </div>
    </li>
  );
}

export default function AccountOverviewPage() {
  useDocumentTitle("Your account");
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  const orders = useQuery(orderQueries.orders({ per_page: 3 }));
  const addresses = useQuery(accountQueries.addresses());
  const wishlist = useQuery(accountQueries.wishlist({ per_page: 1 }));
  const customer = me.data ?? session?.user;
  const firstName = customer?.name?.split(" ")[0] ?? "there";
  const memberSince = customer?.created_at ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(customer.created_at)) : null;

  const tiles = [
    { to: "/account/profile", label: "Profile", Icon: UserRound, detail: customer?.phone ? customer.phone : "Add a phone number" },
    { to: "/account/addresses", label: "Addresses", Icon: MapPin, detail: addresses.data ? `${addresses.data.length} saved` : " " },
    { to: "/account/wishlist", label: "Wishlist", Icon: Heart, detail: wishlist.data ? `${wishlist.data.meta.total ?? 0} saved ${wishlist.data.meta.total === 1 ? "book" : "books"}` : " " },
    { to: "/account/security", label: "Password", Icon: KeyRound, detail: customer?.has_password === false ? "Set a password" : "Change your password" },
  ];

  return (
    <AccountSection
      title={`Hello, ${firstName}`}
      lead={
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {customer?.email_verified ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <BadgeCheck className="size-4" aria-hidden="true" /> Email verified
            </span>
          ) : null}
          {memberSince ? <span>Reading with Bookly since {memberSince}</span> : null}
        </p>
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {tiles.map(({ to, label, Icon, detail }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block truncate text-sm text-muted-foreground">{detail}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="recent-orders" className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 id="recent-orders" className="font-display text-[1.563rem] leading-tight">
          Recent orders
        </h2>
        <div className="mt-4">
          {orders.isPending ? (
            <SkeletonGroup label="Loading orders…" className="grid gap-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </SkeletonGroup>
          ) : orders.isError ? (
            <InlineError error={orders.error} onRetry={() => orders.refetch()} />
          ) : orders.data.data.length === 0 ? (
            <EmptyState
              icon={Package}
              headingLevel="h3"
              title="No orders yet"
              description="When you place an order, you'll be able to follow it here."
              action={
                <Link to="/books" className={buttonVariants()}>
                  Browse books
                </Link>
              }
              className="py-6"
            />
          ) : (
            <ul>
              {orders.data.data.map((order) => (
                <RecentOrder key={order.id} order={order} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </AccountSection>
  );
}
