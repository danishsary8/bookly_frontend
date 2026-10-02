import { useQuery } from "@tanstack/react-query";
import { ChevronRight, RotateCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import type { ReturnRequest } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { ReturnStatusBadge } from "@/components/orders/ReturnStatusBadge";
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
import { formatUsd } from "@/stores/currency";

const PER_PAGE = 10;

function ReturnRow({ item }: { item: ReturnRequest }) {
  const count = (item.items ?? []).reduce((sum, line) => sum + (line.quantity ?? 0), 0);
  return (
    <li>
      <Link
        to={`/account/returns/${item.id}`}
        className="group grid gap-3 rounded-xl border border-border bg-card p-4 outline-none transition-colors duration-150 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
      >
        <span className="grid min-w-0 gap-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">Return #{item.id}</span>
            <ReturnStatusBadge status={item.status} />
          </span>
          <span className="text-sm text-muted-foreground">
            Order <span className="tabular-nums">{item.order_number}</span> · requested {orderDate(item.requested_at)} · {count} {count === 1 ? "book" : "books"}
          </span>
        </span>
        <span className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-right">
            <span className="block font-semibold tabular-nums">{formatUsd(item.refund_amount_usd)}</span>
            <span className="block text-xs text-muted-foreground">{item.is_refund_final ? "refunded" : "estimated refund"}</span>
          </span>
          <ChevronRight className="size-4 text-primary transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

/* /account/returns: the customer's return requests, newest first. */
export default function ReturnsPage() {
  useDocumentTitle("Your returns");
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const returns = useQuery({ ...orderQueries.returns({ page, per_page: PER_PAGE }), placeholderData: (previous) => previous });
  const showSkeleton = useSkeletonVisible(returns.isPending);
  const meta = returns.data?.meta;
  const list = returns.data?.data ?? [];

  return (
    <AccountSection
      title="Returns"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "return" : "returns") : "Books you've asked to send back."}
    >
      {returns.isError && !returns.data ? (
        <ErrorState error={returns.error} onRetry={() => returns.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : returns.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label="Loading returns…" className="grid gap-3">
            <SkeletonRow thumb="none" />
            <SkeletonRow thumb="none" />
          </SkeletonGroup>
        ) : null
      ) : list.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No returns"
          description="To send books back, open a delivered order and choose Request a return."
          action={
            <Link to="/account/orders?status=delivered" className={buttonVariants({ variant: "outline" })}>
              Delivered orders
            </Link>
          }
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul className={cn("grid gap-3", returns.isPlaceholderData && "opacity-60 transition-opacity")} aria-label="Your returns">
          {list.map((item) => (
            <ReturnRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={(p) => (p > 1 ? `?page=${p}` : "?")} className="mt-4" />
    </AccountSection>
  );
}
