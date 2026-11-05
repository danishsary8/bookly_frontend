import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, Check, Loader2 } from "lucide-react";
import { staffApi, staffQueries, type StaffSeriesDetail, type StaffSeriesVolumeBook } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

interface SeriesVolumesDialogProps {
  seriesId: number;
  seriesName: string;
  onClose: () => void;
}

export function SeriesVolumesDialog({ seriesId, seriesName, onClose }: SeriesVolumesDialogProps) {
  const { dict } = useT();
  const vDict = dict.seriesVolumes;
  const queryClient = useQueryClient();

  const seriesQuery = useQuery(staffQueries.seriesDetail(seriesId));
  const series = seriesQuery.data as StaffSeriesDetail | undefined;

  // Local user overrides: bookId -> order string
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);

  // Compute effective order and duplicate counts declaratively
  const books = series?.books ?? [];
  const orderCounts: Record<string, number> = {};

  books.forEach((b: StaffSeriesVolumeBook) => {
    const val = (overrides[b.id] ?? (b.series_order != null ? String(b.series_order) : "")).trim();
    if (val !== "") {
      orderCounts[val] = (orderCounts[val] ?? 0) + 1;
    }
  });

  const localDuplicates = Object.keys(orderCounts).filter((k) => (orderCounts[k] ?? 0) > 1);

  const saveMutation = useMutation({
    mutationFn: (volumes: Array<{ id: number; series_order: number | null }>) =>
      staffApi.updateSeriesVolumes(seriesId, { volumes }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "series", seriesId] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(vDict.orderSaved);
      if (data.warnings && data.warnings.length > 0) {
        setServerWarnings(data.warnings);
      } else {
        setServerWarnings([]);
      }
    },
    onError: () => {
      toast.error(dict.common.error);
    },
  });

  const handleSave = () => {
    if (!books.length) return;
    const volumesPayload = books.map((b: StaffSeriesVolumeBook) => {
      const val = (overrides[b.id] ?? (b.series_order != null ? String(b.series_order) : "")).trim();
      const num = val && !isNaN(Number(val)) ? Number(val) : null;
      return { id: b.id, series_order: num };
    });
    saveMutation.mutate(volumesPayload);
  };

  const hasDuplicateWarning =
    localDuplicates.length > 0 ||
    serverWarnings.length > 0 ||
    Boolean(series?.has_duplicate_orders);

  return (
    <Dialog open onOpenChange={(open) => !open && !saveMutation.isPending && onClose()}>
      <DialogContent size="lg" className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" aria-hidden="true" />
            <span>{vDict.manageVolumes}: {seriesName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Duplicate warning banner */}
        {hasDuplicateWarning ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-tint p-3 text-warning-foreground"
          >
            <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">{vDict.duplicateOrdersWarning}</p>
              {localDuplicates.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shared numbers: {localDuplicates.map((n) => `#${n}`).join(", ")}
                </p>
              ) : series?.duplicate_orders && series.duplicate_orders.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shared numbers: {series.duplicate_orders.map((n: number) => `#${n}`).join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {seriesQuery.isPending ? (
          <SkeletonGroup label="Loading volumes…" className="grid gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </SkeletonGroup>
        ) : books.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No books have been assigned to this series yet.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2.5 w-24">Order #</th>
                  <th scope="col" className="px-4 py-2.5">Book Title</th>
                  <th scope="col" className="px-4 py-2.5 w-24">Status</th>
                  <th scope="col" className="px-4 py-2.5 w-24 text-right">In Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {books.map((book: StaffSeriesVolumeBook) => {
                  const currentOrderVal =
                    overrides[book.id] ?? (book.series_order != null ? String(book.series_order) : "");
                  const isDuplicate =
                    currentOrderVal.trim() !== "" &&
                    (orderCounts[currentOrderVal.trim()] ?? 0) > 1;

                  return (
                    <tr key={book.id} className="hover:bg-surface-1 transition-colors">
                      <td className="px-4 py-2.5">
                        <label htmlFor={`order-input-${book.id}`} className="sr-only">
                          Order for {book.title}
                        </label>
                        <input
                          id={`order-input-${book.id}`}
                          type="number"
                          min="1"
                          step="1"
                          placeholder="—"
                          value={currentOrderVal}
                          onChange={(e) =>
                            setOverrides((prev) => ({ ...prev, [book.id]: e.target.value }))
                          }
                          className={`h-9 w-20 rounded-md border px-2.5 text-center font-medium tabular-nums outline-none transition focus:ring-2 ${
                            isDuplicate
                              ? "border-warning bg-warning-tint/20 text-warning-foreground focus:ring-warning"
                              : "border-input bg-card focus:ring-ring"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          {book.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt=""
                              aria-hidden="true"
                              className="h-10 w-7 rounded object-cover shrink-0"
                            />
                          ) : null}
                          <div>
                            <p className="line-clamp-1">{book.title}</p>
                            {book.authors?.length > 0 ? (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {book.authors.map((a) => a.name).join(", ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          tone={book.status === "live" ? "success" : "neutral"}
                          shape="tint"
                          size="sm"
                        >
                          {book.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <Badge
                          tone={book.in_stock ? "success" : "danger"}
                          shape="outline"
                          size="sm"
                        >
                          {book.in_stock ? "Yes" : "Out"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !books.length}
            className="gap-1.5"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            <span>{vDict.saveOrder}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
