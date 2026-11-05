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
  return <AdminPage title={dict.ratings.title}>
    <SelectField label={dict.reviews.yourRating} value={stars} onChange={(event) => { setStars(event.target.value); setPage(1); }}><option value="">{dict.ratings.all}</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{dict.reviews.stars(n)}</option>)}</SelectField>
    {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
    {hide.isError ? <ErrorState error={hide.error} onRetry={() => hide.reset()} /> : null}
    <ul className="grid gap-4">{query.data?.data.map((rating) => <li key={rating.id} className="grid gap-3 rounded-lg border border-border bg-card p-4"><Link to={`/admin/orders/${rating.order_id}`} className="min-h-11 font-semibold text-primary">{rating.order_number}</Link><p>{dict.reviews.stars(rating.stars ?? 0)}</p><p className="whitespace-pre-wrap break-words">{rating.comment}</p><Button variant="outline" disabled={rating.is_comment_hidden || hide.isPending} onClick={() => hide.mutate(rating.id!)}>{dict.ratings.hide}</Button></li>)}</ul>
    <div className="flex gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>{dict.ratings.previous}</Button><Button variant="outline" disabled={page >= (query.data?.meta.last_page ?? 1)} onClick={() => setPage(page + 1)}>{dict.ratings.next}</Button></div>
  </AdminPage>;
}
