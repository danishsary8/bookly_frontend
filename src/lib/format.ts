/*
 * The PHP API serialises decimals as strings ("19.99") and sometimes ids/counts too,
 * whatever the TypeScript types say. Always go through these before displaying or
 * doing arithmetic with a price.
 */

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatPrice = (value: unknown): string => usd.format(toNumber(value));

// Multiplies in cents so 19.99 × 3 is 59.97, not 59.970000000000006.
export const lineTotal = (unitPrice: unknown, quantity: unknown): number =>
  Math.round(toNumber(unitPrice) * 100 * Math.max(0, Math.trunc(toNumber(quantity)))) / 100;

// API timestamps arrive as "2026-09-25 11:42:11" (space, no zone); parse as local time.
export const formatOrderDate = (value?: string | null, withTime = false): string => {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};
