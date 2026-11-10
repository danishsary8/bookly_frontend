import { useId, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * PeekRating (the React Bits "Peek Rating" idea, rebuilt on our tokens and as a native radio group):
 * hovering a star lifts and magnifies it with a little label tip above, the stars up to it fill, and choosing one
 * pops it. Arrow keys move between stars; each has a spoken label. allowClear: choosing the current value again clears it.
 * Reduced motion: the global rule in index.css stops the lift/pop transitions.
 */
const STAR = "M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z";

export interface PeekRatingProps {
  value: number;
  onChange: (value: number) => void;
  count?: number;
  /** Word for each value, e.g. ["Poor", "Fair", "Good", "Great", "Superb"]. */
  labels: string[];
  /** Spoken name for one option, e.g. (n) => `${n} stars`. */
  optionLabel?: (n: number) => string;
  size?: number;
  lift?: number;
  magnify?: number;
  showTip?: boolean;
  allowClear?: boolean;
  invalid?: boolean;
  className?: string;
}

export function PeekRating({
  value,
  onChange,
  count = 5,
  labels,
  optionLabel = (n) => `${n}`,
  size = 32,
  lift = 7,
  magnify = 1.15,
  showTip = true,
  allowClear = false,
  invalid,
  className,
}: PeekRatingProps) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const [popped, setPopped] = useState(0);
  const shown = hover || value;

  return (
    <div className={cn("flex items-center", className)} onMouseLeave={() => setHover(0)} role="presentation">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const peeking = hover === n;
        return (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="relative grid cursor-pointer place-items-center rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            style={{ width: size + 12, height: size + 12 }}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              aria-invalid={invalid || undefined}
              onChange={() => {
                setPopped(n);
                onChange(n);
              }}
              onClick={() => {
                if (allowClear && value === n) onChange(0);
              }}
              className="sr-only"
            />
            <span className="sr-only">
              {optionLabel(n)}: {labels[n - 1]}
            </span>
            {showTip ? (
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-semibold text-background shadow-md transition-[opacity,transform] duration-200",
                  peeking ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
                )}
              >
                {labels[n - 1]}
              </span>
            ) : null}
            <span
              key={popped === n ? `pop-${value}` : "still"}
              aria-hidden="true"
              className={cn("block transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]", popped === n && value === n && "peek-pop")}
              style={{ transform: peeking ? `translateY(${-lift}px) scale(${magnify})` : undefined } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" width={size} height={size} strokeWidth={1.5} className={cn("transition-colors duration-150", n <= shown ? "fill-star stroke-star" : "fill-transparent stroke-input")}>
                <path d={STAR} strokeLinejoin="round" />
              </svg>
            </span>
          </label>
        );
      })}
    </div>
  );
}
