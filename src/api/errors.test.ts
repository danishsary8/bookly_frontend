import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, errorMessage } from "./errors";

const httpError = (status: number, data: unknown, headers: Record<string, string> = {}) => {
  const response = { status, data, headers, statusText: "", config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, response);
};

describe("ApiError.from", () => {
  it("maps validation errors with their fields", () => {
    const error = ApiError.from(httpError(422, { message: "The email has already been taken.", errors: { email: ["The email has already been taken."] } }));
    expect(error.kind).toBe("validation");
    expect(error.field("email")).toBe("The email has already been taken.");
    expect(error.field("name")).toBeUndefined();
  });

  it("tells unverified customers and staff without 2FA apart from other 403s", () => {
    expect(ApiError.from(httpError(403, { message: "Please verify your email address first." })).kind).toBe("email_unverified");
    expect(ApiError.from(httpError(403, { message: "Set up 2FA", two_factor_setup_required: true })).kind).toBe("two_factor_setup_required");
    expect(ApiError.from(httpError(403, { message: "This action is unauthorized." })).kind).toBe("forbidden");
  });

  it("reads Retry-After on 429 and the request id on any error", () => {
    const error = ApiError.from(httpError(429, { message: "Too Many Attempts." }, { "retry-after": "42", "x-request-id": "abc-123" }));
    expect(error.kind).toBe("rate_limited");
    expect(error.retryAfter).toBe(42);
    expect(error.message).toContain("42 seconds");
    expect(error.requestId).toBe("abc-123");
  });

  it("never shows server internals for 5xx", () => {
    const error = ApiError.from(httpError(500, { message: "SQLSTATE[42P01] relation missing" }));
    expect(error.kind).toBe("server");
    expect(error.message).not.toContain("SQLSTATE");
  });

  it("treats a missing response as a network problem", () => {
    const error = ApiError.from(new AxiosError("Network Error", "ERR_NETWORK"));
    expect(error.kind).toBe("network");
    expect(errorMessage(error)).toMatch(/can't reach/i);
  });

  it("maps 401, 404, 409 and unexpected statuses", () => {
    expect(ApiError.from(httpError(401, { message: "Unauthenticated." })).kind).toBe("unauthenticated");
    expect(ApiError.from(httpError(404, { message: "No query results" })).message).toBe("We couldn't find that.");
    expect(ApiError.from(httpError(409, { message: "Already reviewed" })).kind).toBe("conflict");
    expect(ApiError.from(httpError(405, { message: "Method not allowed" })).kind).toBe("unexpected");
  });
});
