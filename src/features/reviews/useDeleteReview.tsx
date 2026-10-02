import { useState } from "react";
import type { OwnReview } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/dialog";
import { toast } from "@/stores/toast";
import { useReviewMutations } from "./useReviews";

/** "Delete your review?" confirmation: call `ask(review)`, render `dialog` once. */
export function useDeleteReview() {
  const { remove } = useReviewMutations();
  const [pending, setPending] = useState<OwnReview | null>(null);
  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(open) => !open && setPending(null)}
      title="Delete your review?"
      description="Your rating and comment are removed. You can write a new review later."
      confirmLabel="Delete review"
      loading={remove.isPending}
      onConfirm={() =>
        pending &&
        remove.mutate(pending, {
          onSuccess: () => {
            setPending(null);
            toast.success("Review deleted");
          },
          onError: (error) => {
            setPending(null);
            toast.error({ title: "Couldn't delete the review", description: error.message });
          },
        })
      }
    />
  );
  return { ask: setPending, dialog };
}
