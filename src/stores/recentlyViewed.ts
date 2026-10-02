import { useSyncExternalStore } from "react";
import type { BookCard } from "@/api/types";

/*
 * Books this browser opened, newest first, at most 12. Kept in localStorage
 * (no account needed) as the BookCard fields a card needs, so the Home shelf
 * renders without another request. Synced across tabs.
 */

const KEY = "bookly.recentlyViewed";
export const RECENT_LIMIT = 12;

const listeners = new Set<() => void>();
let cache: { raw: string | null; books: BookCard[] } = { raw: null, books: [] };

const read = (): BookCard[] => {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cache.books;
  }
  if (raw === cache.raw) return cache.books;
  let books: BookCard[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    books = Array.isArray(parsed) ? parsed.filter((b): b is BookCard => typeof b?.id === "number").slice(0, RECENT_LIMIT) : [];
  } catch {
    books = [];
  }
  cache = { raw, books };
  return books;
};

const emit = () => listeners.forEach((listener) => listener());

export const getRecentlyViewed = () => read();

export function addRecentlyViewed(book: BookCard) {
  if (typeof book.id !== "number") return;
  const card: BookCard = {
    id: book.id,
    title: book.title,
    language: book.language,
    publish_date: book.publish_date,
    authors: book.authors,
    cover_image_url: book.cover_image_url,
    price_from_usd: book.price_from_usd,
    price_from_khr: book.price_from_khr,
    formats: book.formats,
    in_stock: book.in_stock,
    rating_avg: book.rating_avg,
    review_count: book.review_count,
  };
  const next = [card, ...read().filter((b) => b.id !== book.id)].slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cache = { raw: cache.raw, books: next };
  }
  emit();
}

export function clearRecentlyViewed() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    cache = { raw: null, books: [] };
  }
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => event.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const EMPTY: BookCard[] = [];
export const useRecentlyViewed = () => useSyncExternalStore(subscribe, read, () => EMPTY);
