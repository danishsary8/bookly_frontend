import Cookies from "js-cookie";

const FAVORITES_KEY_PREFIX = "bookly:favorites";

const getStorageKey = () => {
  const token = Cookies.get("token");
  if (!token) return "";
  return `${FAVORITES_KEY_PREFIX}:${token}`;
};

export const isAuthenticated = () => Boolean(Cookies.get("token"));

export const loadFavorites = (): number[] => {
  const key = getStorageKey();
  if (!key) return [];

  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
};

export const saveFavorites = (ids: number[]) => {
  const key = getStorageKey();
  if (!key) return;
  window.localStorage.setItem(key, JSON.stringify(ids));
};

export const toggleFavoriteId = (current: number[], bookId: number) => {
  if (current.includes(bookId)) {
    return current.filter((id) => id !== bookId);
  }
  return [...current, bookId];
};
