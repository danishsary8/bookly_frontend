import Cookies from "js-cookie";

import type { AuthSessionData, User } from "../types/auth.types";

const ACCESS_TOKEN_COOKIE = "token";
const REFRESH_TOKEN_KEY = "refresh_token";
const AUTH_USER_KEY = "auth_user";
const AUTH_EVENT = "auth-changed";

const notifyAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
};

export const setSession = (session: AuthSessionData) => {
  Cookies.set(ACCESS_TOKEN_COOKIE, session.access_token, { expires: 7 });

  if (session.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  notifyAuthChanged();
};

export const updateStoredUser = (user: User) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
};

export const clearSession = () => {
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  notifyAuthChanged();
};

export const getAccessToken = () => Cookies.get(ACCESS_TOKEN_COOKIE) ?? "";

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(getAccessToken());

export const AUTH_CHANGED_EVENT = AUTH_EVENT;
