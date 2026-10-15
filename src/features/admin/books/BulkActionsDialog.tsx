import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import { staffApi, type BookStatus, type StaffBook } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { FormAlert } from "@/components/form/FormAlert";
import { TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

export type BulkActionType = "categories" | "status" | "variants" | null;

export function BulkActionsDialog({
  books,
  action,
  isAdmin,
  onClose,
  onSuccess,
}: {
  books: StaffBook[];
  action: BulkActionType;
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  // Categories state
  const categories = useQuery(catalogQueries.categories());
  const [addCatIds, setAddCatIds] = useState<number[]>([]);
  const [removeCatIds, setRemoveCatIds] = useState<number[]>([]);

  // Status state
  const [targetStatus, setTargetStatus] = useState<BookStatus>("live");
  const [publishAt, setPublishAt] = useState<string>("");

  // Variants state
  const [stockQuantity, setStockQuantity] = useState<string>("");
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("");
  const [isActive, setIsActive] = useState<string>("keep"); // "keep" | "active" | "inactive"
  const [priceUsd, setPriceUsd] = useState<string>("");

  const bookIds = books.map((b) => b.id);
  const variantIds = books.flatMap((b) => b.variants.map((v) => v.id));

  const bookMutation = useMutation({
    mutationFn: (payload: { ids: number[]; add_category_ids?: number[]; remove_category_ids?: number[]; status?: BookStatus; publish_at?: string | null }) =>
      staffApi.bulkUpdateBooks(payload),
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated_count} books.`);
      onSuccess();
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message || "Bulk update failed.");
      else setError("Failed to perform bulk update.");
    },
  });

  const variantMutation = useMutation({
    mutationFn: (payload: { ids: number[]; stock_quantity?: number; low_stock_threshold?: number; is_active?: boolean; price_usd?: string }) =>
      staffApi.bulkUpdateVariants(payload),
    onSuccess: (data) => {
      toast.success(`Updated ${data.updated_count} variants across ${books.length} books.`);
      onSuccess();
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message || "Bulk update failed.");
      else setError("Failed to perform bulk update.");
    },
  });

  const isPending = bookMutation.isPending || variantMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (action === "categories") {
      if (addCatIds.length === 0 && removeCatIds.length === 0) {
        setError("Select at least one category to add or remove.");
        return;
      }
      bookMutation.mutate({
        ids: bookIds,
        add_category_ids: addCatIds.length > 0 ? addCatIds : undefined,
        remove_category_ids: removeCatIds.length > 0 ? removeCatIds : undefined,
      });
    } else if (action === "status") {
      if (!isAdmin) {
        setError("Only administrators can change book publishing status.");
        return;
      }
      if (targetStatus === "scheduled") {
        if (!publishAt) {
          setError("A future publish date and time is required for scheduled status.");
          return;
        }
        if (new Date(publishAt).getTime() <= Date.now()) {
          setError("Scheduled publish date must be in the future.");
          return;
        }
      }
      bookMutation.mutate({
        ids: bookIds,
        status: targetStatus,
        publish_at: targetStatus === "scheduled" && publishAt ? new Date(publishAt).toISOString() : null,
      });
    } else if (action === "variants") {
      const payload: { ids: number[]; stock_quantity?: number; low_stock_threshold?: number; is_active?: boolean; price_usd?: string } = {
        ids: variantIds,
      };
      let hasChanges = false;
      if (stockQuantity.trim() !== "") {
        const sq = Number(stockQuantity);
        if (isNaN(sq) || sq < 0) {
          setError("Stock quantity must be a non-negative number.");
          return;
        }
        payload.stock_quantity = sq;
        hasChanges = true;
      }
      if (lowStockThreshold.trim() !== "") {
        const th = Number(lowStockThreshold);
        if (isNaN(th) || th < 0) {
          setError("Low stock threshold must be a non-negative number.");
          return;
        }
        payload.low_stock_threshold = th;
        hasChanges = true;
      }
      if (isActive !== "keep") {
        payload.is_active = isActive === "active";
        hasChanges = true;
      }
      if (priceUsd.trim() !== "") {
        if (!isAdmin) {
          setError("Only administrators can change book prices.");
          return;
        }
        if (!/^\d+(\.\d{1,2})?$/.test(priceUsd)) {
          setError("Price must be a valid dollar amount (e.g. 19.99).");
          return;
        }
        payload.price_usd = priceUsd;
        hasChanges = true;
      }

      if (!hasChanges) {
        setError("Please specify at least one variant property to update.");
        return;
      }

      variantMutation.mutate(payload);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {action === "categories"
              ? `Manage Categories (${books.length} selected)`
              : action === "status"
                ? `Update Publishing Status (${books.length} selected)`
                : `Bulk Update Variants (${variantIds.length} formats across ${books.length} books)`}
          </DialogTitle>
          <DialogDescription>
            {action === "categories"
              ? "Add or remove categories for all selected books."
              : action === "status"
                ? "Change publishing state for all selected books."
                : "Update stock, alert levels, and availability for formats belonging to the selected books."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {error ? <FormAlert title={error} /> : null}

          {action === "categories" ? (
            <div className="grid gap-4">
              <div>
                <h4 className="mb-2 text-sm font-semibold">Add Categories</h4>
                <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-2">
                  {(categories.data ?? []).map((c) => {
                    const checked = addCatIds.includes(c.id!);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(on) =>
                            setAddCatIds((prev) => (on ? [...prev, c.id!] : prev.filter((id) => id !== c.id)))
                          }
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Remove Categories</h4>
                <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-2">
                  {(categories.data ?? []).map((c) => {
                    const checked = removeCatIds.includes(c.id!);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(on) =>
                            setRemoveCatIds((prev) => (on ? [...prev, c.id!] : prev.filter((id) => id !== c.id)))
                          }
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {action === "status" ? (
            <div className="grid gap-3">
              <label className="text-sm font-semibold">Target Status</label>
              <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-2">
                {(["draft", "scheduled", "live"] as const).map((s) => (
                  <label
                    key={s}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      targetStatus === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-surface-2",
                    )}
                  >
                    <input
                      type="radio"
                      name="bulk_status"
                      value={s}
                      checked={targetStatus === s}
                      onChange={() => setTargetStatus(s)}
                      className="sr-only"
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
              {targetStatus === "scheduled" ? (
                <TextField
                  label="Publish Date & Time"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
              ) : null}
            </div>
          ) : null}

          {action === "variants" ? (
            <div className="grid gap-3">
              <TextField
                label="Set stock quantity (all physical formats)"
                type="number"
                placeholder="Leave blank to keep unchanged"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
              <TextField
                label="Set low-stock alert threshold"
                type="number"
                placeholder="Leave blank to keep unchanged"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
              {isAdmin ? (
                <TextField
                  label="Set price USD (Admin only)"
                  placeholder="e.g. 19.99 (leave blank to keep unchanged)"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                />
              ) : null}
              <div className="grid gap-1">
                <label className="text-sm font-semibold">Active Status</label>
                <div className="flex gap-2">
                  {[
                    { val: "keep", label: "Keep current" },
                    { val: "active", label: "Active" },
                    { val: "inactive", label: "Inactive" },
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                        isActive === opt.val
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-surface-2",
                      )}
                    >
                      <input
                        type="radio"
                        name="active_status"
                        value={opt.val}
                        checked={isActive === opt.val}
                        onChange={() => setIsActive(opt.val)}
                        className="sr-only"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-3">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isPending}>
              Apply changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
