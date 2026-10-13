import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { InvoiceSheet } from "@/features/orders/documents/OrderSheets";
import { PrintFrame } from "@/features/orders/documents/PrintFrame";
import { invoiceTitle } from "@/features/orders/documents/invoiceTitle";

/* /account/orders/:id/invoice: the customer's own invoice, ready to print or save as PDF. */
export default function InvoicePrintPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const invoice = useQuery({ ...orderQueries.invoice(id), enabled: valid });
  const doc = invoice.data;
  const error = invoice.isError ? ApiError.from(invoice.error) : null;

  return (
    <PrintFrame title={doc ? `${invoiceTitle(doc)} ${doc.order_number}` : "Invoice"} backTo={valid ? `/account/orders/${id}` : "/account/orders"} backLabel="Back to the order" ready={!!doc}>
      {!valid || error?.kind === "not_found" ? (
        <p className="paper-sheet paper">We couldn't find this order.</p>
      ) : error?.kind === "validation" ? (
        <p className="paper-sheet paper">{error.message}</p>
      ) : error ? (
        <ErrorState error={invoice.error} onRetry={() => invoice.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : !doc ? (
        <SkeletonGroup label="Loading invoice…" className="paper-sheet paper grid gap-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
        </SkeletonGroup>
      ) : (
        <InvoiceSheet doc={doc} />
      )}
    </PrintFrame>
  );
}
