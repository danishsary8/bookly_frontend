import { useId } from "react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

/** Native radios provide arrow keys, one tab stop, and screen-reader state without custom key handling. */
export function StarRatingInput({ value, onChange, error }: { value: number; onChange: (stars: number) => void; error?: string }) {
  const name = useId();
  const { dict } = useT();
  return <fieldset role="radiogroup" aria-labelledby={`${name}-label`} aria-describedby={error ? `${name}-error` : undefined} className="grid gap-2">
    <legend id={`${name}-label`} className="text-sm font-semibold">{dict.reviews.yourRating}</legend>
    <div className="flex flex-wrap">{[1, 2, 3, 4, 5].map((stars) => <label key={stars} className="grid size-11 cursor-pointer place-items-center rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <input type="radio" className="sr-only" name={name} value={stars} checked={value === stars} onChange={() => onChange(stars)} aria-invalid={!!error} />
      <span className="sr-only">{dict.reviews.stars(stars)}: {dict.reviews.words[stars]}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-7", stars <= value ? "fill-star stroke-star" : "fill-transparent stroke-muted-foreground")}><path d="m12 3 3 6 6 1-4.5 4.5 1 6L12 18l-5.5 2.5 1-6L3 10l6-1z" /></svg>
    </label>)}</div>
    {error ? <p id={`${name}-error`} className="text-sm text-destructive">{error}</p> : null}
  </fieldset>;
}
