import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Download, Hourglass, PackagePlus, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { purchaseApi, purchaseQuery } from "@/api/endpoints/purchases";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { Panel } from "@/features/admin/reportKit";
import { DaysPill } from "@/features/admin/reports/InventoryTab";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import "@/features/admin/dashboard/dashboard.css";

/*
 * /admin/purchases: what to buy. One row per format that is low or has customers waiting, grouped by book, with how
 * fast it sold in the last 30 days and when it runs out (inventory report, Phase 2). Most urgent first.
 */
export default function PurchaseListPage() {
  const { dict } = useT();
  const t = dict.purchaseList;
  const query = useQuery(purchaseQuery());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const rows = query.data ?? [];
  // Urgent first: out of stock, then fewest days left, then most waiting.
  const urgency = (r: (typeof rows)[number]) => (r.stock_quantity <= 0 ? -1 : (r.days_left ?? 9999));
  const groups = [...rows]
    .sort((a, b) => urgency(a) - urgency(b) || b.waiting_quantity - a.waiting_quantity || a.title.localeCompare(b.title))
    .reduce((result, row) => {
      const existing = result.get(row.book_id) ?? [];
      existing.push(row);
      result.set(row.book_id, existing);
      return result;
    }, new Map<number, typeof rows>());
  const toBuy = rows.reduce((n, r) => n + r.quantity_to_buy, 0);
  const waiting = rows.reduce((n, r) => n + r.waiting_quantity, 0);
  const hasSpeed = rows.some((r) => r.days_left !== undefined);

  async function download() {
    setExporting(true);
    setExportError(false);
    try {
      const blob = await purchaseApi.csv();
      const url = URL.createObjectURL(blob);
      const anchor = Object.assign(document.createElement("a"), { href: url, download: "purchase-list.csv" });
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  const head = [t.book, t.format, t.sku, t.stock, t.threshold, t.waiting, ...(hasSpeed ? [t.runsOut] : []), t.buy];

  return (
    <div className="dash-overview">
      <AdminPage title={t.title} lead={t.lead} actions={<Button variant="outline" loading={exporting} onClick={() => void download()}><Download aria-hidden="true" />{t.export}</Button>}>
        {exportError ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive-tint px-4 py-3 text-[15px] text-destructive">{t.failed}</p> : null}
        {query.isPending ? (
          <SkeletonGroup label={t.loading} className="grid gap-4">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </SkeletonGroup>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} />
        ) : rows.length === 0 ? (
          <Panel id="purchases-empty" title={t.title} icon={CheckCircle2} tone="green">
            <p className="flex items-center gap-2 text-[15px] text-success"><CheckCircle2 className="size-4" aria-hidden="true" />{t.empty}</p>
          </Panel>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2" aria-label={t.title}>
              <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold"><ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" />{groups.size} {t.book.toLowerCase()} · {rows.length} {t.format.toLowerCase()}</li>
              <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-warning/30 bg-warning-tint px-3 text-sm font-semibold text-warning"><PackagePlus className="size-4" aria-hidden="true" />{t.buy} {toBuy.toLocaleString("en-US")}</li>
              {waiting > 0 ? <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-destructive/30 bg-destructive-tint px-3 text-sm font-semibold text-destructive"><ShoppingCart className="size-4" aria-hidden="true" />{t.waiting} {waiting.toLocaleString("en-US")}</li> : null}
            </ul>
            <Panel id="purchases-table" title={t.title} icon={Hourglass} tone="coral">
              <div role="region" aria-label={t.title} tabIndex={0} className="overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                <table className="w-full min-w-[46rem] text-left text-[15px]">
                  <thead className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    <tr>{head.map((heading, i) => <th key={heading} scope="col" className={cn("px-3 pb-2 font-semibold", i >= 3 && "text-right")}>{heading}</th>)}</tr>
                  </thead>
                  {[...groups].map(([bookId, items]) => (
                    <tbody key={bookId}>
                      {items.map((row, index) => (
                        <tr key={row.variant_id} className={cn("border-t border-border/70", index === 0 && "border-border")}>
                          {index === 0 ? (
                            <th scope="rowgroup" rowSpan={items.length} className="px-3 py-3 align-top font-normal">
                              <Link to={`/admin/books/${row.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">{row.title}</Link>
                            </th>
                          ) : null}
                          <td className="px-3 py-3">{formatLabel(row.format)}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{row.sku}</td>
                          <td className="px-3 py-3 text-right tabular-nums">
                            {row.stock_quantity <= 0 ? <span className="inline-flex items-center gap-1 font-semibold text-destructive"><AlertTriangle className="size-3.5" aria-hidden="true" />{row.stock_quantity}</span> : row.stock_quantity}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{row.low_stock_threshold}</td>
                          <td className={cn("px-3 py-3 text-right tabular-nums", row.waiting_quantity > 0 && "font-semibold text-destructive")}>{row.waiting_quantity}</td>
                          {hasSpeed ? (
                            <td className="px-3 py-3 text-right">
                              {row.days_left == null ? (
                                <span className="text-sm text-muted-foreground">{t.notSelling}</span>
                              ) : (
                                <span className="inline-grid justify-items-end gap-0.5">
                                  <DaysPill days={row.days_left} label={t.daysLeft.replace("{n}", String(row.days_left))} />
                                  <span className="text-xs text-muted-foreground tabular-nums">{t.soldLast.replace("{n}", String(row.sold_last_30_days ?? 0))}</span>
                                </span>
                              )}
                            </td>
                          ) : null}
                          <td className="px-3 py-3 text-right">
                            <span className="inline-flex min-w-10 justify-center rounded-lg bg-[var(--tone-tint)] px-2.5 py-1 font-bold tabular-nums text-[var(--tone-ink)]">{row.quantity_to_buy}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            </Panel>
          </>
        )}
      </AdminPage>
    </div>
  );
}
