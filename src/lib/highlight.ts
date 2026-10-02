export type TextPart = { text: string; match: boolean };

/**
 * Splits `text` around the words of `query` (case-insensitive, prefix-friendly),
 * so search results can bold what matched: "harry po" in "Harry Potter".
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [{ text, match: false }];

  const escaped = [...words].sort((a, b) => b.length - a.length).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // A capturing split keeps the matched pieces, so a piece matched exactly when it equals a query word.
  return text
    .split(new RegExp(`(${escaped.join("|")})`, "i"))
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: words.includes(part.toLowerCase()) }));
}
