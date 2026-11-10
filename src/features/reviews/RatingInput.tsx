import { useId } from "react";
import { PeekRating } from "@/components/ui/peek-rating";
import { useT } from "@/i18n";

/*
 * Five stars (PeekRating: a native radio group whose hovered star lifts with a word tip, and pops when chosen).
 */
export function RatingInput({ value, onChange, error }: { value: number; onChange: (rating: number) => void; error?: string }) {
  const name = useId();
  const { dict } = useT();
  const t = dict.reviews;
  return (
    <fieldset className="grid gap-2" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1 text-[15px] font-semibold">{t.yourRating}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <PeekRating
          value={value}
          onChange={onChange}
          labels={[1, 2, 3, 4, 5].map((n) => t.words[n])}
          optionLabel={(n) => t.stars(n)}
          invalid={Boolean(error)}
          className="-ml-1.5"
        />
        <span className="text-sm font-medium text-muted-foreground" aria-hidden="true">
          {t.words[value] ?? ""}
        </span>
      </div>
      {error ? (
        <p id={`${name}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
