const HOUR = 3_600_000;

/**
 * "Removed in 2 days" for an unfinished sign-up's `removal_at` (rounded the way people say it:
 * hours under a day, then whole days). Past times read "Removal due": the next clean-up takes it.
 */
export function removalLabel(iso: string, now = Date.now()): string {
  const left = new Date(iso).getTime() - now;
  if (left <= 0) return "Removal due";
  if (left < HOUR) return "Removed in under an hour";
  const hours = Math.round(left / HOUR);
  if (hours < 24) return `Removed in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `Removed in ${days} day${days === 1 ? "" : "s"}`;
}
