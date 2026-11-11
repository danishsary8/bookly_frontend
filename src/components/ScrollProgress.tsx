/*
 * Where you are in a sideways-scrolling row: a thin track whose thumb follows the scroll (New arrivals, Continue where
 * you left off, Shop by category). Shown only when the row really scrolls. Decorative: the arrows and the row itself
 * are the controls.
 */

export function ScrollProgress({ bar }: { bar: { size: number; at: number } }) {
  if (bar.size >= 0.995) return null;
  return (
    <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-border" aria-hidden="true">
      <span className="block h-full rounded-full bg-primary transition-transform duration-150 ease-out" style={{ width: `${bar.size * 100}%`, transform: `translateX(${(bar.at * (1 - bar.size) * 100) / bar.size}%)` }} />
    </div>
  );
}
