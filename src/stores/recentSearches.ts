import { useSyncExternalStore } from "react";

/*
 * Search queries executed by this browser, newest first, at most 8 items.
 * Persisted in localStorage key bookly_recent_searches_v1 with private mode safety.
 */

const KEY = "bookly_recent_searches_v1";
export const RECENT_SEARCHES_LIMIT = 8;

const listeners = new Set<() => void>();

let cachedRaw: string | null = "__initial__";
let cachedQueries: string[] = [];

export const getRecentSearches = (): string[] => {
  if (typeof window === "undefined") return [];

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return [];
  }

  if (raw === cachedRaw) {
    return cachedQueries;
  }

  cachedRaw = raw;
  if (!raw) {
    cachedQueries = [];
    return cachedQueries;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedQueries = [];
      return cachedQueries;
    }

    cachedQueries = parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((q) => q.length > 0)
      .slice(0, RECENT_SEARCHES_LIMIT);

    return cachedQueries;
  } catch {
    cachedQueries = [];
    return cachedQueries;
  }
};

const emit = () => listeners.forEach((listener) => listener());

export function addRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  const clean = query.trim();
  if (!clean) return;

  const current = getRecentSearches();
  // Filter out exact case-insensitive matches to bring to the top
  const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    RECENT_SEARCHES_LIMIT,
  );

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ignore private mode or storage quota exceeded
  }
  emit();
}

export function removeRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  const clean = query.trim().toLowerCase();
  const current = getRecentSearches();
  const next = current.filter((item) => item.toLowerCase() !== clean);

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  emit();
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
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
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
};

const EMPTY_QUERIES: string[] = [];
export const useRecentSearches = (): string[] =>
  useSyncExternalStore(subscribe, getRecentSearches, () => EMPTY_QUERIES);
