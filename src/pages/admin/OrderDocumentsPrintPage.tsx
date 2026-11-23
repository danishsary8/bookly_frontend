import { useQuery } from "@tanstack/react-query";
import { FileText, Printer, Truck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { opsQueries } from "@/api/endpoints/staffOps";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useStaff } from "@/features/admin/staffSession";
import { usePortal, usePortalPath } from "@/features/admin/portal";
import { DeliveryManifestSheet, InvoiceSheet, PackingSlipSheet } from "@/features/orders/documents/OrderSheets";
import { PrintFrame } from "@/features/orders/documents/PrintFrame";
import { MAX_PRINT, parsePrintIds, staffPrintPath, type PrintDoc } from "@/features/orders/documents/printLinks";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

const MODES: Array<{ value: PrintDoc; label: string; Icon: typeof FileText }> = [
  { value: "invoice", label: "Invoices", Icon: FileText },
  { value: "packing-slip", label: "Packing slips", Icon: Printer },
  { value: "manifest", label: "Delivery manifest", Icon: Truck },
];

const parseDoc = (raw: string | null): PrintDoc =>
  raw === "invoice" || raw === "manifest" || raw === "packing-slip" ? raw : "packing-slip";

/*
 * /admin/print?doc=invoice|packing-slip|manifest&ids=1,2,3: invoices, packing slips,
 * or a single courier delivery manifest for up to 50 orders, in the order given.
 * Outside the admin frame so only the sheets print.
 */
export default function OrderDocumentsPrintPage() {
  const [params] = useSearchParams();
  const session = useStaff();
  const portal = usePortal();
  const toPortal = usePortalPath();
  const doc = parseDoc(params.get("doc"));
  const ids = parsePrintIds(params.get("ids"));
  const docs = useQuery({ ...opsQueries.orderDocuments(ids), enabled: ids.length > 0 });
  const list = docs.data ?? [];
  const backTo = ids.length === 1 ? toPortal(`orders/${ids[0]}`) : toPortal("orders");
  const missing = ids.length - list.length;

  const title = doc === "invoice" ? "Invoices" : doc === "manifest" ? "Delivery manifest" : "Packing slips";
  const noun = doc === "invoice" ? "invoice" : doc === "manifest" ? "stop" : "packing slip";
  const batchTotalCents = list.filter((d) => d.status !== "cancelled").reduce((sum, d) => sum + Math.round(Number(d.total_usd ?? 0) * 100), 0);

  return (
    <PrintFrame
      title={title}
      backTo={backTo}
      backLabel={ids.length === 1 ? "Back to the order" : "All orders"}
      ready={docs.isSuccess && list.length > 0}
      controls={
        ids.length > 0 ? (
          <nav aria-label="Document type" className="inline-flex items-center rounded-lg border border-border bg-surface-2/70 p-0.5">
            {MODES.map(({ value, label, Icon }) => {
              const active = doc === value;
              return (
                <Link
                  key={value}
                  to={staffPrintPath(value, ids, false, portal)}
                  replace
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors sm:text-sm",
                    active ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null
      }
      summary={
        docs.isSuccess ? (
          <>
            {list.length} {list.length === 1 ? noun : `${noun}s`}
            {doc === "invoice" && list.length > 1 ? ` · Total ${formatUsd((batchTotalCents / 100).toFixed(2))}` : ""}
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
      ) : doc === "manifest" ? (
        <DeliveryManifestSheet docs={list} staffName={session?.user.name} />
      ) : (
        list.map((d) => (doc === "invoice" ? <InvoiceSheet key={d.id} doc={d} /> : <PackingSlipSheet key={d.id} doc={d} />))
      )}
    </PrintFrame>
  );
}
