/** Published within the last 60 days (and not in the future by more than a day). */
export function isNewRelease(publishDate: string | null | undefined, now = Date.now()) {
  if (!publishDate) return false;
  const time = Date.parse(publishDate);
  if (Number.isNaN(time)) return false;
  const age = now - time;
  return age >= -86_400_000 && age <= 60 * 86_400_000;
}

export const authorNames = (authors: { name?: string }[] | undefined) =>
  (authors ?? []).map((a) => a.name).filter(Boolean).join(", ");
