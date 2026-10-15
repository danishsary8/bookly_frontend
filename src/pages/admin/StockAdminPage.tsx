import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, History, PackagePlus, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { staffQueries, type StockItem } from "@/api/endpoints/staff";
import { CoverThumb } from "@/components/CoverThumb";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { RestockDialog } from "@/features/admin/stock/RestockDialog";
import { StockHistoryDrawer } from "@/features/admin/stock/StockHistoryDrawer";
import { formatLabel } from "@/lib/catalog";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

const PER_PAGE = 20;

type FilterStatus = "all" | "low" | "out";

export default function StockAdminPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const rawStatus = params.get("status");
  const status: FilterStatus = rawStatus === "low" || rawStatus === "out" ? rawStatus : "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);

  const [restockVariant, setRestockVariant] = useState<StockItem | null>(null);
  const [historyVariant, setHistoryVariant] = useState<StockItem | null>(null);

  const stockQuery = useQuery(
    staffQueries.stock({
      status: status === "all" ? undefined : status,
      q: q || undefined,
      page,
      per_page: PER_PAGE,
    })
  );

  const meta = stockQuery.data?.meta;
  const list = stockQuery.data?.data ?? [];

  const go = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v);
      else merged.delete(k);
    }
    setParams(merged, { replace: true });
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    go({ q: draft.trim() || undefined, page: undefined });
  };

  const handleStatusChange = (newStatus: FilterStatus) => {
    go({ status: newStatus === "all" ? undefined : newStatus, page: undefined });
  };

  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    return `?${next.toString()}`;
  };

  return (
    <AdminPage
      title="Stock"
      lead={
        meta && meta.total
          ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "format" : "formats")
          : "Track inventory, view movement logs, and record restock deliveries."
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => handleStatusChange("all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              All formats
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("low")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === "low"
                  ? "bg-warning text-warning-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              Low stock
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("out")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === "out"
                  ? "bg-destructive text-destructive-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              Out of stock
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Title, SKU or ISBN…"
              aria-label="Search stock"
              className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
            />
          </form>
        </div>

        {stockQuery.isPending ? (
          <SkeletonGroup label="Loading stock…" className="grid gap-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </SkeletonGroup>
        ) : stockQuery.isError ? (
          <ErrorState error={stockQuery.error} onRetry={() => stockQuery.refetch()} showHomeLink={false} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={q ? `No formats matching "${q}"` : "No formats in this view"}
            description={
              q
                ? "Try searching for a different title, SKU, or ISBN."
                : status === "low"
                ? "No physical formats are currently low on stock."
                : status === "out"
                ? "No physical formats are currently out of stock."
                : "No physical formats found."
            }
            action={
              q || status !== "all" ? (
                <Button variant="outline" onClick={() => { setDraft(""); go({ q: undefined, status: undefined, page: undefined }); }}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-[15px]">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Book & Format</th>
                  <th className="px-4 py-3">SKU / ISBN</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CoverThumb src={item.cover_image_url} className="w-9 shrink-0" />
                        <div className="min-w-0">
                          <Link
                            to={`/admin/books/${item.book_id}`}
                            className="block truncate font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline"
                          >
                            {item.book_title}
                          </Link>
                          <span className="text-xs text-muted-foreground">{formatLabel(item.format)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-mono">{item.sku}</p>
                      {item.isbn ? <p className="text-xs text-muted-foreground">ISBN: {item.isbn}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm">
                      {formatUsd(item.price_usd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm">
                      <span className={cn("font-semibold", item.status === "out" ? "text-destructive" : item.status === "low" ? "text-warning" : "text-foreground")}>
                        {item.stock_quantity}
                      </span>
                      <span className="block text-xs text-muted-foreground">alert at {item.low_stock_threshold}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "out" ? (
                        <Badge tone="danger" shape="tint" className="gap-1">
                          <AlertTriangle className="size-3" aria-hidden="true" /> Out of stock
                        </Badge>
                      ) : item.status === "low" ? (
                        <Badge tone="warning" shape="tint" className="gap-1">
                          <AlertTriangle className="size-3" aria-hidden="true" /> Low stock
                        </Badge>
                      ) : (
                        <Badge tone="neutral" shape="tint">
                          In stock
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRestockVariant(item)}
                          className="gap-1"
                        >
                          <PackagePlus className="size-3.5" aria-hidden="true" /> Restock
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setHistoryVariant(item)}
                          className="gap-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Stock history for ${item.sku}`}
                        >
                          <History className="size-3.5" aria-hidden="true" /> History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Boolean(meta?.last_page && meta.last_page > 1) ? (
          <div className="pt-2">
            <Pagination
              page={meta?.current_page ?? 1}
              lastPage={meta?.last_page ?? 1}
              hrefFor={hrefFor}
              onPageChange={(p) => go({ page: p > 1 ? String(p) : undefined })}
            />
          </div>
        ) : null}
      </div>

      <RestockDialog
        variant={restockVariant}
        open={Boolean(restockVariant)}
        onOpenChange={(open) => !open && setRestockVariant(null)}
      />

      <StockHistoryDrawer
        variant={historyVariant}
        open={Boolean(historyVariant)}
        onOpenChange={(open) => !open && setHistoryVariant(null)}
      />
    </AdminPage>
  );
}
