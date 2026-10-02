import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, getSession, getToken, setSession, updateSessionUser } from "./session";

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("session store", () => {
  it("keeps customer and staff sessions apart", () => {
    setSession("customer", { token: "c-token", expiresAt: null, user: { id: 1 } });
    setSession("staff", { token: "s-token", expiresAt: null, user: { id: 9 } });

    expect(getToken("customer")).toBe("c-token");
    expect(getToken("staff")).toBe("s-token");

    clearSession("staff");
    expect(getToken("staff")).toBeNull();
    expect(getToken("customer")).toBe("c-token");
  });

  it("treats an expired session as logged out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T10:00:00Z"));
    setSession("customer", { token: "t", expiresAt: "2026-10-02T11:00:00Z", user: {} });
    expect(getToken("customer")).toBe("t");

    vi.setSystemTime(new Date("2026-10-02T11:00:01Z"));
    expect(getSession("customer")).toBeNull();
  });

  it("updates the stored user and keeps the token", () => {
    setSession("customer", { token: "t", expiresAt: null, user: { name: "Old" } });
    updateSessionUser("customer", { name: "New" });
    expect(getSession<{ name: string }>("customer")).toMatchObject({ token: "t", user: { name: "New" } });
  });

  it("ignores corrupted storage", () => {
    window.localStorage.setItem("bookly.session.customer", "{not json");
    expect(getSession("customer")).toBeNull();
  });

  it("returns the same object until storage changes (stable for useSyncExternalStore)", () => {
    setSession("customer", { token: "t", expiresAt: null, user: {} });
    expect(getSession("customer")).toBe(getSession("customer"));
  });
});
