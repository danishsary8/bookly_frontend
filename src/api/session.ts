import { useSyncExternalStore } from "react";

/*
 * Login sessions for the two kinds of account. The API issues Bearer tokens (customers: 7 days,
 * staff: 12 hours) and has no refresh endpoint, so a session simply ends at `expiresAt` or on a 401.
 * Stored in localStorage so a login survives reloads and is shared by every tab.
 */

export type SessionKind = "customer" | "staff";

export interface Session<TUser = unknown> {
  token: string;
  expiresAt: string | null;
  user: TUser;
}

const storageKey = (kind: SessionKind) => `bookly.session.${kind}`;
const listeners = new Set<() => void>();
const cache = new Map<SessionKind, { raw: string | null; value: Session | null }>();

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private mode or blocked storage
  }
};

const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the session lasts until the page is closed.
  }
};

const emit = () => listeners.forEach((listener) => listener());

const isExpired = (session: Session) => session.expiresAt !== null && new Date(session.expiresAt).getTime() <= Date.now();

export const getSession = <TUser = unknown>(kind: SessionKind): Session<TUser> | null => {
  const raw = readStorage(storageKey(kind));
  const cached = cache.get(kind);
  // Same raw value → same object, so useSyncExternalStore does not loop.
  if (cached && cached.raw === raw) {
    return cached.value && isExpired(cached.value) ? null : (cached.value as Session<TUser> | null);
  }

  let value: Session | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Session;
      value = typeof parsed?.token === "string" ? parsed : null;
    } catch {
      value = null;
    }
  }
  cache.set(kind, { raw, value });

  return value && isExpired(value) ? null : (value as Session<TUser> | null);
};

export const setSession = <TUser>(kind: SessionKind, session: Session<TUser>) => {
  writeStorage(storageKey(kind), JSON.stringify(session));
  emit();
};

/** Keep the token, replace the stored profile (after a profile update). */
export const updateSessionUser = <TUser>(kind: SessionKind, user: TUser) => {
  const current = getSession<TUser>(kind);
  if (current) setSession(kind, { ...current, user });
};

export const clearSession = (kind: SessionKind) => {
  writeStorage(storageKey(kind), null);
  emit();
};

export const getToken = (kind: SessionKind): string | null => getSession(kind)?.token ?? null;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // Logins and logouts in other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("bookly.session.")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

export const useSession = <TUser = unknown>(kind: SessionKind): Session<TUser> | null =>
  useSyncExternalStore(subscribe, () => getSession<TUser>(kind), () => null);
