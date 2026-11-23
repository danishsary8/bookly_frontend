import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2, X } from "lucide-react";
import { staffApi, staffQueries, type TrashItem } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const itemKey = (item: TrashItem) => `${item.type}:${item.id}`;

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff", "trash"] });
    void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const restoreMutation = useMutation({
    mutationFn: (item: TrashItem) => staffApi.restoreTrash(item.type, item.id),
    onSuccess: (res, item) => {
      toast.success(res.message || `Restored "${item.name}"`);
      setSelectedKeys((prev) => prev.filter((k) => k !== itemKey(item)));
      invalidateAll();
    },
    onError: (err) => {
      toast.error({
        title: "Could not restore item",
        description: ApiError.from(err).message,
      });
    },
    onSettled: () => setRestoringId(null),
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: async (toRestore: TrashItem[]) => {
      let restored = 0;
      for (const item of toRestore) {
        await staffApi.restoreTrash(item.type, item.id);
        restored += 1;
      }
      return restored;
    },
    onSuccess: (count) => {
      toast.success(`Restored ${count} ${count === 1 ? "item" : "items"}`);
      setSelectedKeys([]);
      invalidateAll();
    },
    onError: (err) => {
      invalidateAll();
      toast.error({
        title: "Bulk restore interrupted",
        description: ApiError.from(err).message,
      });
    },
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

  const allItems = data?.data ?? [];
  const q = searchQuery.trim().toLowerCase();
  const items = q
    ? allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q),
      )
    : allItems;
  const selectedItems = items.filter((item) => selectedKeys.includes(itemKey(item)));
  const allOnPageSelected = items.length > 0 && selectedItems.length === items.length;
  const rawMeta = data?.meta ?? (data as unknown as { current_page?: number; last_page?: number; total?: number } | undefined);
  const meta = rawMeta && typeof rawMeta.last_page === "number" ? rawMeta : undefined;

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
        <div className="work-toolbar">
          <Segmented
            label="Filter by item type"
            value={typeParam}
            options={TYPE_OPTIONS}
            onChange={handleTypeChange}
          />
          <SearchBox
            label="Search trash"
            value={searchQuery}
            placeholder="Filter by name or type…"
            onSearch={setSearchQuery}
            className="max-w-xs"
          />
        </div>

        {selectedItems.length > 0 ? (
          <div role="region" aria-label="Selected trash items" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-lapis-tint px-4 py-2.5">
            <p className="text-sm font-semibold tabular-nums">
              {selectedItems.length} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={bulkRestoreMutation.isPending}
                onClick={() => bulkRestoreMutation.mutate(selectedItems)}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Restore selected ({selectedItems.length})
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedKeys([])}>
                <X className="size-3.5" aria-hidden="true" /> Clear
              </Button>
            </div>
          </div>
        ) : null}

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
            title={q ? `No deleted items matching "${searchQuery}"` : "The trash is empty"}
            description="No deleted catalog items found in the 30-day retention window."
            className="rounded-xl border border-dashed border-border"
          />
        ) : (
          <TableCard minWidth={640}>
            <thead className={thead}>
              <tr>
                <th className={`${th} w-10`}>
                  <Checkbox
                    aria-label="Select all items on page"
                    checked={allOnPageSelected}
                    onCheckedChange={(on) =>
                      setSelectedKeys(on ? items.map(itemKey) : [])
                    }
                  />
                </th>
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
                const key = itemKey(item);
                const isSelected = selectedKeys.includes(key);
                return (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-muted/25">
                    <td className={td}>
                      <Checkbox
                        aria-label={`Select ${item.name}`}
                        checked={isSelected}
                        onCheckedChange={(on) =>
                          setSelectedKeys((prev) =>
                            on ? [...prev, key] : prev.filter((k) => k !== key),
                          )
                        }
                      />
                    </td>
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
