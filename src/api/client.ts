import axios, { type AxiosRequestConfig } from "axios";
import { ApiError } from "./errors";
import { clearSession, getToken, type SessionKind } from "./session";

/** Fired when the API rejects a stored token (expired, revoked, account deactivated). */
export const SESSION_EXPIRED_EVENT = "bookly:session-expired";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";
if (!API_BASE_URL && import.meta.env.MODE !== "test") {
  console.error("VITE_API_BASE_URL is not set. Copy .env.example to .env.");
}

/** Staff routes use the staff token; everything else the customer token. */
export const sessionKindFor = (url = ""): SessionKind => (url.replace(/^\/+/, "").startsWith("staff/") ? "staff" : "customer");

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
  timeout: 70_000, // the free host can take ~60 s to wake up
});

http.interceptors.request.use((config) => {
  const token = getToken(sessionKindFor(config.url));
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = ApiError.from(error);
    const sentToken = Boolean(error?.config?.headers?.Authorization);

    if (apiError.kind === "unauthenticated" && sentToken) {
      const kind = sessionKindFor(error.config?.url);
      clearSession(kind);
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { kind } }));
    }

    return Promise.reject(apiError);
  },
);

/* Small typed helpers that return the response body. */
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig) => (await http.get<T>(url, config)).data,
  post: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => (await http.post<T>(url, body, config)).data,
  put: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => (await http.put<T>(url, body, config)).data,
  patch: async <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => (await http.patch<T>(url, body, config)).data,
  delete: async <T = void>(url: string, config?: AxiosRequestConfig) => (await http.delete<T>(url, config)).data,
};

/** Unique key for one checkout attempt; resending it never creates a second order. */
export const newIdempotencyKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
