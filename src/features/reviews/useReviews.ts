import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogKeys } from "@/api/endpoints/catalog";
import { orderQueries, ordersApi, type ReviewInput } from "@/api/endpoints/orders";
import { useSession } from "@/api/session";
import type { Customer, OwnReview } from "@/api/types";

/** Enough for any customer's own reviews / delivered orders in one request (the API's per_page maximum). */
const ALL = 100;

/*
 * What the signed-in customer can do with reviews of one book: their existing
 * review if any, and whether they may write one (the API allows it once an order
 * containing the book has been delivered, one review per book).
 */
export function useReviewState(bookId: number) {
  const session = useSession<Customer>("customer");
  const verified = Boolean(session) && session?.user?.email_verified !== false;
  const mine = useQuery({ ...orderQueries.myReviews({ per_page: ALL }), enabled: verified });
  const delivered = useQuery({ ...orderQueries.orders({ status: "delivered", per_page: ALL }), enabled: verified });

  const review = mine.data?.data.find((r) => r.book_id === bookId || r.book?.id === bookId) ?? null;
  const bought = delivered.data?.data.some((order) => (order.items ?? []).some((item) => item.book_id === bookId)) ?? false;

  return {
    signedIn: Boolean(session),
    verified,
    loading: verified && (mine.isPending || delivered.isPending),
    error: mine.error ?? delivered.error,
    retry: () => void Promise.all([mine.refetch(), delivered.refetch()]),
    review,
    canWrite: !review && bought,
  };
}

/** Create, edit and delete a review, refreshing the customer's list and the book's public reviews and rating. */
export function useReviewMutations() {
  const queryClient = useQueryClient();
  const refresh = (bookId: number | undefined) => {
    void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    if (bookId) void queryClient.invalidateQueries({ queryKey: catalogKeys.book(bookId) });
  };

  const save = useMutation({
    mutationFn: ({ bookId, review, input }: { bookId: number; review: OwnReview | null; input: ReviewInput }) =>
      review ? ordersApi.updateReview(review.id!, input) : ordersApi.createReview(bookId, input),
    onSuccess: (_saved, { bookId }) => refresh(bookId),
  });

  const remove = useMutation({
    mutationFn: (review: OwnReview) => ordersApi.deleteReview(review.id!),
    onSuccess: (_result, review) => refresh(review.book_id ?? review.book?.id),
  });

  return { save, remove };
}
