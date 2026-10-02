import type { CartIssue, CartLine } from "@/api/types";

/** Issue codes that stop checkout (the API's CartService::BLOCKING_ISSUES); price_changed is informational. */
export const BLOCKING_ISSUES = new Set(["unavailable", "out_of_stock", "insufficient_stock"]);

export const isBlocking = (issue: CartIssue) => BLOCKING_ISSUES.has(issue.code ?? "");

export const lineHasBlockingIssue = (line: CartLine) => (line.issues ?? []).some(isBlocking);

/** The API's per-line limit (CartService::MAX_PER_LINE); ebooks and audiobooks are one per order. */
export const MAX_PER_LINE = 10;
export const DIGITAL_FORMATS = new Set(["ebook", "audiobook"]);
export const isDigitalLine = (line: CartLine) => DIGITAL_FORMATS.has(line.format ?? "");

/** Highest quantity a customer can pick for a line, using the stock the API reports when it's short. */
export function maxQuantity(line: CartLine) {
  if (isDigitalLine(line)) return 1;
  const short = (line.issues ?? []).find((i) => i.code === "insufficient_stock")?.available_quantity;
  return Math.max(1, Math.min(MAX_PER_LINE, short ?? MAX_PER_LINE));
}
