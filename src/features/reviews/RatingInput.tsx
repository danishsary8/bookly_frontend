import { useId, useState } from "react";
import { cn } from "@/lib/utils";

const STAR = "M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z";
const WORDS = ["", "Didn't like it", "It was OK", "Liked it", "Really liked it", "Loved it"];

/*
 * Five stars as a native radio group (arrow keys move between them, each has a
 * spoken label), drawn like StarRating. Hovering previews a rating.
 */
export function RatingInput({ value, onChange, error }: { value: number; onChange: (rating: number) => void; error?: string }) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="grid gap-2" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1 text-[15px] font-semibold">Your rating</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring" onMouseEnter={() => setHover(n)}>
              <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-invalid={error ? true : undefined} />
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}: {WORDS[n]}
              </span>
              <svg viewBox="0 0 24 24" className={cn("size-7 transition-colors duration-100", n <= shown ? "fill-star stroke-star" : "fill-transparent stroke-input")} strokeWidth={1.5} aria-hidden="true">
                <path d={STAR} strokeLinejoin="round" />
              </svg>
            </label>
          ))}
        </div>
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          {WORDS[shown] ?? ""}
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
