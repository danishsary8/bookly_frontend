import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/errors";
import { applyApiErrors, safeNext, withNext } from "./forms";

describe("safeNext", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNext("/books/7?tab=reviews#top")).toBe("/books/7?tab=reviews#top");
    expect(safeNext("/checkout")).toBe("/checkout");
  });

  it.each([null, "", "books", "//evil.com", "/\\evil.com", "https://evil.com/x", "javascript:alert(1)", "/login", "/register?next=/x", "/reset-password"])("rejects %s", (value) => {
    expect(safeNext(value, "/fallback")).toBe("/fallback");
  });
});

describe("withNext", () => {
  it("adds a safe return path and drops unsafe ones", () => {
    const path = withNext("/login", "/books?q=war%20and%20peace");
    expect(new URLSearchParams(path.split("?")[1]).get("next")).toBe("/books?q=war%20and%20peace");
    expect(withNext("/login", "https://evil.com")).toBe("/login");
  });
});

describe("applyApiErrors", () => {
  it("puts field messages on known fields and focuses the first", () => {
    const setError = vi.fn();
    const error = new ApiError({ kind: "validation", status: 422, message: "The email has already been taken.", fieldErrors: { email: ["The email has already been taken."] } });
    expect(applyApiErrors(error, setError, ["email", "password"])).toBeNull();
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "The email has already been taken." }, { shouldFocus: true });
  });

  it("returns the message when a field isn't on the form, or for non-validation errors", () => {
    const setError = vi.fn();
    expect(applyApiErrors(new ApiError({ kind: "validation", status: 422, message: "The code is invalid or has expired.", fieldErrors: {} }), setError, ["code"])).toBe("The code is invalid or has expired.");
    expect(applyApiErrors(new ApiError({ kind: "unauthenticated", status: 401, message: "Invalid email or password." }), setError, ["email"])).toBe("Invalid email or password.");
    expect(setError).not.toHaveBeenCalled();
  });
});
