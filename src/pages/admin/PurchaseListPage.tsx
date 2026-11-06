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
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead><tr>{[t.book, t.format, t.sku, t.stock, t.threshold, t.waiting, t.buy].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
            <tbody>{query.data.map((row) => <tr key={row.variant_id} className="border-t border-border"><th scope="row" className="p-3">{row.title}</th><td className="p-3">{row.format}</td><td className="p-3">{row.sku}</td><td className="p-3 tabular-nums">{row.stock_quantity}</td><td className="p-3 tabular-nums">{row.low_stock_threshold}</td><td className="p-3 tabular-nums">{row.waiting_quantity}</td><td className="p-3 tabular-nums">{row.quantity_to_buy}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
