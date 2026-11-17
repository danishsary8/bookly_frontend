/** Money and SKU helpers for the book and format forms. */

export const MONEY = /^\d+(\.\d{1,2})?$/;

export type Profit = { kind: "none" } | { kind: "profit" | "loss"; amount: number; margin: number };

/** Profit per copy and margin (share of the sell price), or "none" until both numbers are valid. */
export function profitOf(price: string, cost: string): Profit {
  const p = price.trim();
  const c = cost.trim();
  if (!MONEY.test(p) || !MONEY.test(c)) return { kind: "none" };
  const sell = Number(p);
  const amount = Math.round((sell - Number(c)) * 100) / 100;
  const margin = sell > 0 ? amount / sell : 0;
  return { kind: amount < 0 ? "loss" : "profit", amount, margin };
}

/** The same price ending in .99 (12.40 → 12.99), or null when it already does or isn't a price. */
export function charmPrice(price: string): string | null {
  const p = price.trim();
  if (!MONEY.test(p) || Number(p) >= 99999999) return null;
  const charm = `${Math.floor(Number(p))}.99`;
  return Number(charm) === Number(p) ? null : charm;
}

const FORMAT_CODE: Record<string, string> = { paperback: "PB", hardcover: "HC", ebook: "EB", audiobook: "AB" };
const SKIP = new Set(["THE", "A", "AN", "OF", "AND"]);

/** A readable SKU from the title and format: "English File: Intermediate" + paperback → "ENGLISH-FILE-INTERME-PB". */
export function suggestSku(title: string, format: string): string {
  const words = title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w && !SKIP.has(w));
  const stem = words.slice(0, 3).map((w) => w.slice(0, 7)).join("-") || "BOOK";
  return `${stem}-${FORMAT_CODE[format] ?? "FMT"}`.slice(0, 50);
}
