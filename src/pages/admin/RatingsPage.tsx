import { EyeOff, MessageSquareText, Star } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { ListState } from "@/features/admin/listKit";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ratingsApi } from "@/api/endpoints/ratings";
import { SelectField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AdminPage } from "@/features/admin/AdminPage";
import { useT } from "@/i18n";

export default function RatingsPage() {
  const { dict } = useT();
  const [stars, setStars] = useState("");
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["staff", "ratings", stars, page], queryFn: () => ratingsApi.staff(stars, page) });
  const hide = useMutation({ mutationFn: ratingsApi.hide, onSuccess: () => { void client.invalidateQueries({ queryKey: ["staff", "ratings"] }); } });
  return <AdminPage title={dict.ratings.title} lead="Customer feedback from completed orders.">
    <div className="work-toolbar"><SelectField containerClassName="w-full sm:max-w-xs" label={dict.reviews.yourRating} value={stars} onChange={(event) => { setStars(event.target.value); setPage(1); }}><option value="">{dict.ratings.all}</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{dict.reviews.stars(n)}</option>)}</SelectField><p className="text-sm text-muted-foreground sm:ml-auto">{query.data?.meta.total ?? 0} {(query.data?.meta.total ?? 0) === 1 ? "rating" : "ratings"} matching this filter</p></div>
    <p className="work-note"><MessageSquareText aria-hidden="true" />Order feedback helps your team understand the delivery experience. Open an order for its details, or hide a comment when moderation is needed.</p>

    {hide.isError ? <ErrorState error={hide.error} onRetry={() => hide.reset()} /> : null}
    <ListState query={query} empty={{ when: (query.data?.data.length ?? 0) === 0, icon: Star, title: "No ratings match", description: "Customer ratings appear after an order is completed. Try a different rating filter." }}><ul className="work-feedback-list" aria-label="Order ratings">{query.data?.data.map((rating) => <li key={rating.id} className="work-feedback"><div className="work-feedback-body"><div className="work-feedback-meta"><StarRating value={rating.stars} summary={false} /><span>{dict.reviews.stars(rating.stars ?? 0)}</span>{rating.is_comment_hidden ? <span className="inline-flex items-center gap-1"><EyeOff className="size-3.5" aria-hidden="true" />Hidden comment</span> : null}</div><Link to={`/admin/orders/${rating.order_id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{rating.order_number}</Link>{rating.comment ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{rating.comment}</p> : <p className="text-sm text-muted-foreground">No written comment.</p>}</div><Button variant="outline" disabled={rating.is_comment_hidden || hide.isPending} onClick={() => hide.mutate(rating.id!)}><EyeOff className="size-4" aria-hidden="true" />{dict.ratings.hide}</Button></li>)}</ul></ListState>
    <div className="work-pagination"><span>Page {page} of {query.data?.meta.last_page ?? 1}</span><div><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>{dict.ratings.previous}</Button><Button variant="outline" disabled={page >= (query.data?.meta.last_page ?? 1)} onClick={() => setPage(page + 1)}>{dict.ratings.next}</Button></div></div>
  </AdminPage>;
}
