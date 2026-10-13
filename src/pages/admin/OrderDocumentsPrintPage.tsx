import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { opsQueries } from "@/api/endpoints/staffOps";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { InvoiceSheet, PackingSlipSheet } from "@/features/orders/documents/OrderSheets";
import { PrintFrame } from "@/features/orders/documents/PrintFrame";
import { MAX_PRINT, parsePrintIds, type PrintDoc } from "@/features/orders/documents/printLinks";

/*
 * /admin/print?doc=invoice|packing-slip&ids=1,2,3: invoices or packing slips for up to
 * 50 orders, one A4 page each, in the order given. Outside the admin frame so only the
 * sheets print.
 */
export default function OrderDocumentsPrintPage() {
  const [params] = useSearchParams();
  const doc: PrintDoc = params.get("doc") === "invoice" ? "invoice" : "packing-slip";
  const ids = parsePrintIds(params.get("ids"));
  const docs = useQuery({ ...opsQueries.orderDocuments(ids), enabled: ids.length > 0 });
  const noun = doc === "invoice" ? "invoice" : "packing slip";
  const list = docs.data ?? [];
  const backTo = ids.length === 1 ? `/admin/orders/${ids[0]}` : "/admin/orders";
  const missing = ids.length - list.length;

  return (
    <PrintFrame
      title={doc === "invoice" ? "Invoices" : "Packing slips"}
      backTo={backTo}
      backLabel={ids.length === 1 ? "Back to the order" : "All orders"}
      ready={docs.isSuccess && list.length > 0}
      summary={
        docs.isSuccess ? (
          <>
            {list.length} {list.length === 1 ? noun : `${noun}s`}
            {missing > 0 ? ` · ${missing} not found` : ""}
          </>
        ) : null
      }
    >
      {ids.length === 0 ? (
        <p className="paper-sheet paper">Choose up to {MAX_PRINT} orders to print from the orders list.</p>
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => docs.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : !docs.data ? (
        <SkeletonGroup label="Loading…" className="paper-sheet paper grid gap-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
        </SkeletonGroup>
      ) : list.length === 0 ? (
        <p className="paper-sheet paper">None of these orders were found.</p>
      ) : (
        list.map((d) => (doc === "invoice" ? <InvoiceSheet key={d.id} doc={d} /> : <PackingSlipSheet key={d.id} doc={d} />))
      )}
    </PrintFrame>
  );
}
