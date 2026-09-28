import Cookies from "js-cookie";
import { getStoredUser } from "./session";

const FAVORITES_KEY_PREFIX = "bookly:favorites";
const USER_KEY_PREFIX = `${FAVORITES_KEY_PREFIX}:user:`;

/*
 * Favorites used to be stored under `bookly:favorites:<access token>`, so every
 * token refresh or re-login started a new, empty list. They are now keyed by
 * customer id. Legacy entries are JWT-keyed; the token payload carries the
 * customer's `id` and `role`, which lets us move each old entry to its owner.
 */

const parseIds = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
};

const decodeTokenPayload = (token: string): { id?: unknown; role?: unknown } | null => {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")));
  } catch {
    return null;
  }
};

const getCustomerId = (): number | null => {
  if (!Cookies.get("token")) return null;
  const user = getStoredUser();
  if (!user || user.role !== "customer") return null;
  // The PHP API can serialise ids as strings ("5"), whatever the TS type says.
  const id = Number(user.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const migratedFor = new Set<number>();

// One-time (per page load, per customer) move of token-keyed lists into the id-keyed one.
const migrateLegacyEntries = (customerId: number) => {
  if (migratedFor.has(customerId)) return;
  migratedFor.add(customerId);

  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${FAVORITES_KEY_PREFIX}:`) && !key.startsWith(USER_KEY_PREFIX)) {
        legacyKeys.push(key);
      }
    }
    if (!legacyKeys.length) return;

    const userKey = `${USER_KEY_PREFIX}${customerId}`;
    const merged = new Set(parseIds(window.localStorage.getItem(userKey)));
    let changed = false;

    for (const key of legacyKeys) {
      const payload = decodeTokenPayload(key.slice(FAVORITES_KEY_PREFIX.length + 1));
      if (!payload || payload.role !== "customer" || Number(payload.id) !== customerId) continue;

      parseIds(window.localStorage.getItem(key)).forEach((id) => merged.add(id));
      window.localStorage.removeItem(key);
      changed = true;
    }

    if (changed) {
      window.localStorage.setItem(userKey, JSON.stringify([...merged]));
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data); favorites then stay empty.
  }
};

const getStorageKey = () => {
  const customerId = getCustomerId();
  if (customerId === null) return "";
  migrateLegacyEntries(customerId);
  return `${USER_KEY_PREFIX}${customerId}`;
};

export const isAuthenticated = () => Boolean(Cookies.get("token"));

export const loadFavorites = (): number[] => {
  const key = getStorageKey();
  if (!key) return [];
  try {
    return parseIds(window.localStorage.getItem(key));
  } catch {
    return [];
  }
};

export const saveFavorites = (ids: number[]) => {
  const key = getStorageKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Ignore quota/availability errors; the in-memory list still reflects the change.
  }
};

export const toggleFavoriteId = (current: number[], bookId: number) => {
  if (current.includes(bookId)) {
    return current.filter((id) => id !== bookId);
  }
  return [...current, bookId];
};
