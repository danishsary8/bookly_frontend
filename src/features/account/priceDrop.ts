import type { WishlistBookCard } from "@/api/types";

/**
 * "Price dropped 20%" when the book's lowest price is lower now than when it was saved (wishlist_saved_price_usd,
 * from the API). Small drops under 1% are ignored. Null when there is no saved price (older saves) or no drop.
 */
export function priceDropSince(book: WishlistBookCard): { percent: number; savedUsd: number } | null {
  const saved = Number(book.wishlist_saved_price_usd);
  const now = Number(book.price_from_usd);
  if (!book.wishlist_saved_price_usd || !book.price_from_usd || !(saved > 0) || !(now >= 0) || now >= saved) return null;
  const percent = Math.round(((saved - now) / saved) * 100);
  return percent >= 1 ? { percent, savedUsd: saved } : null;
}
