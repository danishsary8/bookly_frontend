import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { purchaseApi, purchaseQuery } from "@/api/endpoints/purchases";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { AdminPage } from "@/features/admin/AdminPage";
import { useT } from "@/i18n";

export default function PurchaseListPage() {
  const { dict } = useT();
  const t = dict.purchaseList;
  const query = useQuery(purchaseQuery());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const groups = (query.data ?? []).reduce((result, row) => {
    const existing = result.get(row.book_id) ?? [];
    existing.push(row);
    result.set(row.book_id, existing);
    return result;
  }, new Map<number, NonNullable<typeof query.data>>());

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

  return (
    <AdminPage title={t.title} lead={t.lead} actions={<Button variant="outline" loading={exporting} onClick={() => void download()}>{t.export}</Button>}>
      {exportError ? <p role="alert">{t.failed}</p> : null}
      {query.isPending ? <p role="status">{t.loading}</p> : query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} /> : query.data.length === 0 ? <p>{t.empty}</p> : (
        <div role="region" aria-label={t.title} tabIndex={0} className="overflow-x-auto rounded-xl border border-border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          <table className="w-full text-left text-sm">
            <thead><tr>{[t.book, t.format, t.sku, t.stock, t.threshold, t.waiting, t.buy].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
            {[...groups].map(([bookId, rows]) => <tbody key={bookId}>{rows.map((row, index) => <tr key={row.variant_id} className="border-t border-border">{index === 0 ? <th scope="rowgroup" rowSpan={rows.length} className="p-3 align-top">{row.title}</th> : null}<td className="p-3">{row.format}</td><td className="p-3">{row.sku}</td><td className="p-3 tabular-nums">{row.stock_quantity}</td><td className="p-3 tabular-nums">{row.low_stock_threshold}</td><td className="p-3 tabular-nums">{row.waiting_quantity}</td><td className="p-3 tabular-nums">{row.quantity_to_buy}</td></tr>)}</tbody>)}
          </table>
        </div>
      )}
    </AdminPage>
  );
}
