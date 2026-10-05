import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import { opsApi, opsQueries, type StaffReview } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, SearchBox, Segmented } from "@/features/admin/listKit";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

const SHOW = [
  { value: "all", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "low", label: "2 stars or less" },
] as const;
type Show = (typeof SHOW)[number]["value"];

function ReviewRow({ review }: { review: StaffReview }) {
  const queryClient = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => (review.is_visible ? opsApi.hideReview(review.id) : opsApi.showReview(review.id)),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(saved.is_visible ? "Review shown in the shop" : "Review hidden from the shop");
    },
    onError: (error) => toast.error({ title: "Couldn't change the review", description: ApiError.from(error).message }),
  });
  return (
    <li className={cn("grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:p-5", !review.is_visible && "bg-surface-2/60")}>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarRating value={review.rating} summary={false} />
          {review.is_visible ? null : (
            <Badge tone="neutral" shape="outline">
              <EyeOff aria-hidden="true" /> Hidden
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">{orderDate(review.created_at)}</span>
        </div>
        <p className="text-[15px]">
          <Link to={`/admin/books/${review.book.id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
            {review.book.title ?? "Deleted book"}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            · by{" "}
            <Link to={`/admin/customers/${review.customer.id}`} className="underline-offset-4 hover:text-primary hover:underline">
              {review.customer.name}
            </Link>
          </span>
        </p>
        {review.comment ? <p className="whitespace-pre-line text-[15px]">{review.comment}</p> : <p className="text-sm text-muted-foreground">No comment, just a rating.</p>}
      </div>
      <Button variant="outline" size="sm" onClick={() => toggle.mutate()} loading={toggle.isPending} className="justify-self-start">
        {review.is_visible ? (
          <>
            <EyeOff aria-hidden="true" /> Hide
          </>
        ) : (
          <>
            <Eye aria-hidden="true" /> Show
          </>
        )}
      </Button>
    </li>
  );
}

/*
 * /admin/reviews: every review, newest first, with Hide / Show. Hidden reviews
 * stay in the customer's account (marked hidden) and leave the book's rating.
 */
export default function ReviewsAdminPage() {
  const { get, page, set, hrefFor } = useListParams();
  const raw = get("show") as Show;
  const show: Show = SHOW.some((s) => s.value === raw) ? raw : "all";
  const q = get("q");
  const reviews = useQuery(
    opsQueries.reviews({ q: q || undefined, visible: show === "visible" ? true : show === "hidden" ? false : null, max_rating: show === "low" ? 2 : undefined, page, per_page: 20 }),
  );
  const meta = reviews.data?.meta;
  const list = reviews.data?.data ?? [];

  return (
    <AdminPage
      title="Reviews"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "review" : "reviews") : "What customers say about their books."}
    >
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search reviews" value={q} placeholder="Words in the review" onSearch={(v) => set({ q: v || undefined })} />
        <Segmented label="Show" value={show} options={[...SHOW]} onChange={(v) => set({ show: v === "all" ? undefined : v })} />
      </div>
      <p className="text-sm text-muted-foreground">Hide reviews that break the rules in the terms (abuse, personal details, spam, not about the book). The customer still sees it, marked as hidden.</p>
      <ListState query={reviews} empty={{ when: list.length === 0, icon: MessageSquareText, title: "No reviews match", description: "Try another filter or search." }}>
        <ul className={cn("grid gap-3", reviews.isPlaceholderData && "opacity-60 transition-opacity")} aria-label="Reviews">
          {list.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ul>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
    </AdminPage>
  );
}
