import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, http, newIdempotencyKey, SESSION_EXPIRED_EVENT, sessionKindFor } from "./client";
import { ApiError } from "./errors";
import { getToken, setSession } from "./session";

const sent: InternalAxiosRequestConfig[] = [];
const respond = (status: number, data: unknown = {}): AxiosAdapter => async (config) => {
  sent.push(config);
  const response = { status, data, headers: {}, statusText: "", config };
  if (status >= 400) {
    const { AxiosError } = await import("axios");
    throw new AxiosError("fail", "ERR_BAD_RESPONSE", config, undefined, response);
  }
  return response;
};

afterEach(() => {
  sent.length = 0;
  window.localStorage.clear();
  http.defaults.adapter = undefined;
});

describe("sessionKindFor", () => {
  it("uses the staff session for staff routes only", () => {
    expect(sessionKindFor("/staff/orders")).toBe("staff");
    expect(sessionKindFor("staff/auth/me")).toBe("staff");
    expect(sessionKindFor("/books")).toBe("customer");
    expect(sessionKindFor("/staffing")).toBe("customer");
  });
});

describe("http client", () => {
  it("sends the matching Bearer token", async () => {
    setSession("customer", { token: "customer-token", expiresAt: null, user: {} });
    setSession("staff", { token: "staff-token", expiresAt: null, user: {} });
    http.defaults.adapter = respond(200, { data: [] });

    await api.get("/cart");
    await api.get("/staff/orders");

    expect(sent[0].headers.Authorization).toBe("Bearer customer-token");
    expect(sent[1].headers.Authorization).toBe("Bearer staff-token");
  });

  it("sends no Authorization header when logged out", async () => {
    http.defaults.adapter = respond(200, {});
    await api.get("/books");
    expect(sent[0].headers.Authorization).toBeUndefined();
  });

  it("ends the session and announces it when the API rejects the token", async () => {
    setSession("customer", { token: "old", expiresAt: null, user: {} });
    http.defaults.adapter = respond(401, { message: "Unauthenticated." });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(api.get("/me")).rejects.toBeInstanceOf(ApiError);

    expect(getToken("customer")).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("keeps the session on a failed login (no token was sent)", async () => {
    http.defaults.adapter = respond(401, { message: "Invalid email or password." });
    const error = await api.post("/auth/login", {}).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "unauthenticated", message: "Invalid email or password." });
  });
});

describe("newIdempotencyKey", () => {
  it("matches the API's allowed format and is unique", () => {
    const a = newIdempotencyKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(newIdempotencyKey()).not.toBe(a);
  });
});
