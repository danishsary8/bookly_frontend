import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/api/errors";
import type { OwnReview } from "@/api/types";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast";
import { RatingInput } from "./RatingInput";
import { useReviewMutations } from "./useReviews";
import { useT } from "@/i18n";

const MAX_COMMENT = 2000;

const QUICK_TAGS_EN = [
  "Must-read!",
  "Great print & packaging",
  "Fast delivery",
  "Inspiring & practical",
  "Highly recommended",
];

const QUICK_TAGS_KM = [
  "សៀវភៅល្អគួរអាន!",
  "ការវេចខ្ចប់ និងបោះពុម្ពស្អាត",
  "ដឹកជញ្ជូនរហ័ស",
  "មានអត្ថប្រយោជន៍ខ្លាំង",
  "សូមណែនាំឱ្យអាន",
];

/** Write a review, or edit `review`. The API's messages (not bought yet, already reviewed, too many) show above the form. */
export function ReviewForm({ bookId, review, onDone }: { bookId: number; review: OwnReview | null; onDone: () => void }) {
  const { save } = useReviewMutations();
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [errors, setErrors] = useState<{ form?: string; rating?: string; comment?: string }>({});
  const alertRef = useRef<HTMLDivElement>(null);
  const { dict, lang } = useT();
  const t = dict.reviews;
  const quickTags = lang === "km" ? QUICK_TAGS_KM : QUICK_TAGS_EN;

  const toggleQuickTag = (tag: string) => {
    setComment((prev) => {
      if (prev.includes(tag)) return prev;
      const trimmed = prev.trim();
      const next = trimmed ? `${trimmed} ${tag}` : tag;
      return next.slice(0, MAX_COMMENT);
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!rating) return setErrors({ rating: t.chooseRating });
    setErrors({});
    save.mutate(
      { bookId, review, input: { rating, comment: comment.trim() || null } },
      {
        onSuccess: () => {
          toast.success(review ? t.updated : { title: t.thanks, description: t.thanksLead });
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
        <FormAlert ref={alertRef} title={review ? t.notUpdated : t.notPosted}>
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
      <div className="flex flex-wrap items-center gap-1.5" aria-label={lang === "km" ? "ពាក្យគន្លឹះរហ័ស" : "Quick review tags"}>
        {quickTags.map((tag) => {
          const active = comment.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleQuickTag(tag)}
              aria-pressed={active}
              className={
                active
                  ? "inline-flex min-h-8 items-center rounded-full border border-primary/40 bg-lapis-tint px-3 py-1 text-xs font-semibold text-primary transition-colors"
                  : "inline-flex min-h-8 items-center rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-lapis-tint/40"
              }
            >
              + {tag}
            </button>
          );
        })}
      </div>
      <TextAreaField
        label={t.yourReview}
        optional
        hint={t.hint(MAX_COMMENT)}
        value={comment}
        maxLength={MAX_COMMENT}
        error={errors.comment}
        onChange={(event) => setComment(event.target.value)}
        rows={5}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={save.isPending}>
          {review ? t.save : t.post}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
          {dict.ui.cancel}
        </Button>
      </div>
    </form>
  );
}
