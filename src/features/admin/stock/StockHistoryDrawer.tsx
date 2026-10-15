import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { staffQueries } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

interface VariantInfo {
  id: number;
  book_title?: string;
  format?: string;
  sku: string;
  stock_quantity?: number;
}

export function StockHistoryDrawer({
  variant,
  open,
  onOpenChange,
}: {
  variant: VariantInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const variantId = variant?.id ?? 0;

  const history = useQuery({
    ...staffQueries.stockHistory(variantId, { page, per_page: 20 }),
    enabled: open && variantId > 0,
  });

  const movements = history.data?.data ?? [];
  const meta = history.data?.meta;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const reasonTone = (reason: string) => {
    switch (reason) {
      case "restock":
        return "success";
      case "return":
        return "info";
      case "adjustment":
        return "neutral";
      case "sale":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) setPage(1);
        onOpenChange(next);
      }}
    >
      <DrawerContent side="right" className="w-[min(96vw,720px)]">
        <DrawerHeader className="border-b border-border pb-3">
          <DrawerTitle className="text-lg">
            Stock history · {variant ? `${variant.book_title ? `${variant.book_title} — ` : ""}${formatLabel(variant.format)}` : "variant"}
          </DrawerTitle>
          <p className="text-sm text-muted-foreground">
            SKU: <span className="font-mono">{variant?.sku}</span>
            {variant?.stock_quantity !== undefined ? ` · Current stock: ${variant.stock_quantity}` : ""}
          </p>
        </DrawerHeader>

        <DrawerBody className="p-4">
          {history.isPending ? (
            <SkeletonGroup label="Loading stock history…" className="grid gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </SkeletonGroup>
          ) : history.isError ? (
            <p className="rounded-md bg-destructive-tint p-4 text-sm text-destructive">
              Couldn&apos;t load stock history.
            </p>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="grid gap-4">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Reason</th>
                      <th className="px-3 py-2.5 text-right">Change</th>
                      <th className="px-3 py-2.5 text-right">Balance</th>
                      <th className="px-3 py-2.5">Reference / Note</th>
                      <th className="px-3 py-2.5">Staff</th>
                      {movements.some((m) => m.unit_cost_usd !== undefined) ? (
                        <th className="px-3 py-2.5 text-right">Cost</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((m) => {
                      const positive = m.change_qty > 0;
                      return (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                            {formatDate(m.created_at)}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge tone={reasonTone(m.reason)} shape="tint" className="capitalize">
                              {m.reason}
                            </Badge>
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold",
                              positive ? "text-success" : "text-destructive"
                            )}
                          >
                            {positive ? `+${m.change_qty}` : m.change_qty}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-medium text-foreground">
                            {m.stock_after ?? "—"}
                          </td>
                          <td className="max-w-[180px] px-3 py-2.5 text-xs">
                            {m.reference?.type === "order" ? (
                              <Link
                                to={`/admin/orders/${m.reference.id}`}
                                className="font-semibold text-primary underline-offset-2 hover:underline"
                              >
                                {m.reference.order_number ?? `Order #${m.reference.id}`}
                              </Link>
                            ) : m.reference?.type === "return" ? (
                              <Link
                                to={`/admin/returns/${m.reference.id}`}
                                className="font-semibold text-primary underline-offset-2 hover:underline"
                              >
                                Return #{m.reference.id}
                              </Link>
                            ) : null}
                            {m.supplier ? (
                              <p className="truncate text-muted-foreground" title={m.supplier}>
                                Supplier: {m.supplier}
                              </p>
                            ) : null}
                            {m.note ? (
                              <p className="truncate text-muted-foreground" title={m.note}>
                                {m.note}
                              </p>
                            ) : null}
                            {!m.reference && !m.supplier && !m.note ? "—" : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                            {m.staff?.name ?? "System"}
                          </td>
                          {movements.some((item) => item.unit_cost_usd !== undefined) ? (
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">
                              {m.unit_cost_usd ? formatUsd(m.unit_cost_usd) : "—"}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {meta?.last_page && meta.last_page > 1 ? (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1} ({meta?.total ?? 0} movements)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" /> Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(meta?.last_page && page >= meta.last_page)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
