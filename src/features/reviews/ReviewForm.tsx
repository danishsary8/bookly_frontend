import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/api/errors";
import type { OwnReview } from "@/api/types";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast";
import { RatingInput } from "./RatingInput";
import { useReviewMutations } from "./useReviews";

const MAX_COMMENT = 2000;

/** Write a review, or edit `review`. The API's messages (not bought yet, already reviewed, too many) show above the form. */
export function ReviewForm({ bookId, review, onDone }: { bookId: number; review: OwnReview | null; onDone: () => void }) {
  const { save } = useReviewMutations();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [errors, setErrors] = useState<{ form?: string; rating?: string; comment?: string }>({});
  const alertRef = useRef<HTMLDivElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!rating) return setErrors({ rating: "Choose a rating from 1 to 5 stars." });
    setErrors({});
    save.mutate(
      { bookId, review, input: { rating, comment: comment.trim() || null } },
      {
        onSuccess: () => {
          toast.success(review ? "Review updated" : { title: "Thanks for your review", description: "It helps other readers choose." });
          onDone();
        },
        onError: (error) => {
          const apiError = ApiError.from(error);
          const rating = apiError.field("rating");
          const comment = apiError.field("comment");
          setErrors({ rating, comment, form: rating || comment ? undefined : apiError.message });
          requestAnimationFrame(() => alertRef.current?.focus());
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {errors.form ? (
        <FormAlert ref={alertRef} title={review ? "Your review wasn't updated" : "Your review wasn't posted"}>
          {errors.form}
        </FormAlert>
      ) : null}
      <RatingInput
        value={rating}
        onChange={(next) => {
          setRating(next);
          setErrors((current) => ({ ...current, rating: undefined }));
        }}
        error={errors.rating}
      />
      <TextAreaField
        label="Your review"
        optional
        hint={`What did you think? Up to ${MAX_COMMENT} characters.`}
        value={comment}
        maxLength={MAX_COMMENT}
        error={errors.comment}
        onChange={(event) => setComment(event.target.value)}
        rows={5}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={save.isPending}>
          {review ? "Save review" : "Post review"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
