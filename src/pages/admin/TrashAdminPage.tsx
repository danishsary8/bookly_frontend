import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { staffApi, staffQueries, type TrashItem } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { toast } from "@/stores/toast";

const TYPE_OPTIONS = [
  { value: "all", label: "All items" },
  { value: "books", label: "Books" },
  { value: "authors", label: "Authors" },
  { value: "categories", label: "Categories" },
  { value: "publishers", label: "Publishers" },
  { value: "series", label: "Series" },
];

export default function TrashAdminPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const typeParam = params.get("type") || "all";
  const pageParam = Math.max(1, Number(params.get("page") || 1));

  const queryType = typeParam === "all" ? undefined : typeParam;

  const { data, isLoading, error, refetch } = useQuery(
    staffQueries.trash({ type: queryType, page: pageParam })
  );

  const [restoringId, setRestoringId] = useState<number | null>(null);

  const restoreMutation = useMutation({
    mutationFn: (item: TrashItem) => staffApi.restoreTrash(item.type, item.id),
    onSuccess: (res, item) => {
      toast.success(res.message || `Restored "${item.name}"`);
      void queryClient.invalidateQueries({ queryKey: ["staff", "trash"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (err) => {
      toast.error({
        title: "Could not restore item",
        description: ApiError.from(err).message,
      });
    },
    onSettled: () => setRestoringId(null),
  });

  const handleTypeChange = (nextType: string) => {
    const next = new URLSearchParams(params);
    if (nextType === "all") next.delete("type");
    else next.set("type", nextType);
    next.delete("page");
    setParams(next);
  };

  const handlePageChange = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    setParams(next);
  };

  const items = data?.data ?? [];
  const meta = data?.meta;

  const typeBadge = (type: string) => {
    switch (type) {
      case "book":
        return { tone: "info" as const, shape: "solid" as const };
      case "author":
        return { tone: "neutral" as const, shape: "tint" as const };
      case "category":
        return { tone: "neutral" as const, shape: "outline" as const };
      case "publisher":
        return { tone: "warning" as const, shape: "tint" as const };
      case "series":
        return { tone: "info" as const, shape: "tint" as const };
      default:
        return { tone: "neutral" as const, shape: "tint" as const };
    }
  };

  return (
    <AdminPage
      title="Trash"
      lead="Soft-deleted catalog items are kept here for 30 days before permanent cleanup. Restoring an item immediately brings it back to the catalog."
      actions={
        <Badge shape="outline" tone="neutral" className="flex items-center gap-1.5 py-1">
          <Trash2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span>30-day retention window</span>
        </Badge>
      }
    >
      <div className="space-y-4">
        <Segmented
          label="Filter by item type"
          value={typeParam}
          options={TYPE_OPTIONS}
          onChange={handleTypeChange}
        />

        {isLoading ? (
          <SkeletonGroup label="Loading trash items…" className="grid gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </SkeletonGroup>
        ) : error ? (
          <ErrorState
            error={error}
            onRetry={() => void refetch()}
            headingLevel="h2"
            showHomeLink={false}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="The trash is empty"
            description="No deleted catalog items found in the 30-day retention window."
            className="rounded-xl border border-dashed border-border"
          />
        ) : (
          <TableCard minWidth={640}>
            <thead className={thead}>
              <tr>
                <th className={th}>Item</th>
                <th className={th}>Type</th>
                <th className={th}>Deleted Date</th>
                <th className={th}>Retention</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const badge = typeBadge(item.type);
                return (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-muted/25">
                    <td className={`${td} font-medium text-foreground`}>
                      {item.name}
                    </td>
                    <td className={td}>
                      <Badge tone={badge.tone} shape={badge.shape} className="capitalize">
                        {item.type}
                      </Badge>
                    </td>
                    <td className={`${td} text-muted-foreground`}>
                      {new Date(item.deleted_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className={td}>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.days_until_purge <= 3
                            ? "bg-destructive/15 text-destructive"
                            : item.days_until_purge <= 7
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-surface-2 text-muted-foreground"
                        }`}
                      >
                        {item.days_until_purge} {item.days_until_purge === 1 ? "day" : "days"} left
                      </span>
                    </td>
                    <td className={`${td} text-right`}>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={restoringId === item.id && restoreMutation.isPending}
                        onClick={() => {
                          setRestoringId(item.id);
                          restoreMutation.mutate(item);
                        }}
                      >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Restore
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableCard>
        )}

        {meta && meta.last_page && meta.last_page > 1 ? (
          <div className="flex justify-end pt-2">
            <Pagination
              page={meta.current_page ?? 1}
              lastPage={meta.last_page}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
      </div>
    </AdminPage>
  );
}
