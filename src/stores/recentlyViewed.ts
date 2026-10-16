import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";

/*
 * Books this browser opened, newest first, at most 12 book IDs. Kept in localStorage
 * key bookly.recentlyViewed, wrapped in try/catch (private mode safe).
 * The shelves load book cards via GET /books?ids=1,2,3 so unlisted or modified books update cleanly.
 */

const KEY = "bookly.recentlyViewed";
export const RECENT_LIMIT = 12;

const listeners = new Set<() => void>();

let cachedRaw: string | null = "__initial__";
let cachedIds: number[] = [];

export const getRecentlyViewedIds = (): number[] => {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return [];
  }
  if (raw === cachedRaw) {
    return cachedIds;
  }
  cachedRaw = raw;
  if (!raw) {
    cachedIds = [];
    return cachedIds;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedIds = [];
      return cachedIds;
    }
    cachedIds = parsed
      .map((item) =>
        typeof item === "number"
          ? item
          : typeof item === "object" && item !== null && "id" in item
            ? Number(item.id)
            : Number(item)
      )
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, RECENT_LIMIT);
    return cachedIds;
  } catch {
    cachedIds = [];
    return cachedIds;
  }
};

const emit = () => listeners.forEach((listener) => listener());

export function addRecentlyViewed(idOrBook: number | { id?: number; [key: string]: unknown }) {
  const id = typeof idOrBook === "number" ? idOrBook : idOrBook?.id;
  if (typeof id !== "number" || id <= 0) return;
  const current = getRecentlyViewedIds();
  const next = [id, ...current.filter((i) => i !== id)].slice(0, RECENT_LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ignore private mode or storage quota exceeded
  }
  emit();
}

export function clearRecentlyViewed() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore
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

const EMPTY_IDS: number[] = [];
export const useRecentlyViewedIds = () =>
  useSyncExternalStore(subscribe, getRecentlyViewedIds, () => EMPTY_IDS);

export const useRecentlyViewed = (excludeId?: number): BookCard[] => {
  const ids = useRecentlyViewedIds();
  const filtered = excludeId ? ids.filter((id) => id !== excludeId) : ids;
  const idsParam = filtered.join(",");

  const query = useQuery({
    ...catalogQueries.books({ ids: idsParam }),
    enabled: filtered.length > 0,
  });

  return query.data?.data ?? [];
};

export const getRecentlyViewed = () =>
  getRecentlyViewedIds().map((id) => ({ id }) as BookCard);
