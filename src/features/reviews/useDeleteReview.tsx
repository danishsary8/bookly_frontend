import { useState } from "react";
import type { OwnReview } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/dialog";
import { toast } from "@/stores/toast";
import { useReviewMutations } from "./useReviews";
import { useT } from "@/i18n";

/** "Delete your review?" confirmation: call `ask(review)`, render `dialog` once. */
export function useDeleteReview() {
  const { remove } = useReviewMutations();
  const [pending, setPending] = useState<OwnReview | null>(null);
  const { dict } = useT();
  const t = dict.reviews;
  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(open) => !open && setPending(null)}
      title={t.deleteTitle}
      description={t.deleteLead}
      confirmLabel={t.deleteConfirm}
      loading={remove.isPending}
      onConfirm={() =>
        pending &&
        remove.mutate(pending, {
          onSuccess: () => {
            setPending(null);
            toast.success(t.deleted);
          },
          onError: (error) => {
            setPending(null);
            toast.error({ title: t.deleteFailed, description: error.message });
          },
        })
      }
    />
  );
  return { ask: setPending, dialog };
}
