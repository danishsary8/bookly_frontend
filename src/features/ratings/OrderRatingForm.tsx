import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ratingsApi, type OrderRating } from "@/api/endpoints/ratings";
import { ApiError } from "@/api/errors";
import { StarRatingInput } from "@/components/ratings/StarRatingInput";
import { TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { useT } from "@/i18n";

function Editor({ id, rating }: { id: number; rating: OrderRating | null }) {
  const { dict } = useT();
  const client = useQueryClient();
  const [stars, setStars] = useState(rating?.stars ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? "");
  const save = useMutation({ mutationFn: () => ratingsApi.save(id, { stars, comment: comment.trim() || null }, !!rating), onSuccess: () => { void client.invalidateQueries({ queryKey: ["order-rating", id] }); } });
  if (rating && !rating.can_edit) return <p>{dict.ratings.saved(rating.stars ?? 0)}</p>;
  return <form className="grid gap-4 rounded-lg border border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
    <h2 className="font-display text-xl">{dict.ratings.rateOrder}</h2>
    <StarRatingInput value={stars} onChange={setStars} />
    <TextField label={dict.ratings.comment} value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} />
    <p className="text-sm text-muted-foreground">{dict.ratings.editWindow}</p>
    {save.isError ? <p role="alert" className="text-destructive">{ApiError.from(save.error).message}</p> : null}
    <Button type="submit" disabled={stars === 0} loading={save.isPending}>{dict.ratings.save}</Button>
  </form>;
}

export function OrderRatingForm({ orderId }: { orderId: number }) {
  const query = useQuery({ queryKey: ["order-rating", orderId], queryFn: () => ratingsApi.own(orderId) });
  if (query.isError) return <InlineError error={query.error} onRetry={() => query.refetch()} />;
  if (query.isPending) return null;
  return <Editor key={`${query.data?.id ?? "new"}:${query.data?.stars}`} id={orderId} rating={query.data} />;
}
