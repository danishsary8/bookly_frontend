import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

const firstError = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  result.success ? null : { path: result.error!.issues[0].path.join("."), message: result.error!.issues[0].message };

describe("auth schemas", () => {
  it("accepts a valid registration and trims fields", () => {
    const result = registerSchema.safeParse({ name: " Sok Dara ", email: " dara@example.com ", phone: "", password: "reading1", password_confirmation: "reading1" });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("dara@example.com");
  });

  it("matches the API's password rule: 8+ characters with a letter and a number", () => {
    const base = { name: "A", email: "a@b.co", phone: "", password_confirmation: "" };
    expect(firstError(registerSchema.safeParse({ ...base, password: "short1", password_confirmation: "short1" }))).toEqual({ path: "password", message: "Use at least 8 characters." });
    expect(firstError(registerSchema.safeParse({ ...base, password: "12345678", password_confirmation: "12345678" }))).toEqual({ path: "password", message: "Include at least one letter." });
    expect(firstError(registerSchema.safeParse({ ...base, password: "abcdefgh", password_confirmation: "abcdefgh" }))).toEqual({ path: "password", message: "Include at least one number." });
  });

  it("requires matching confirmation", () => {
    expect(firstError(registerSchema.safeParse({ name: "A", email: "a@b.co", phone: "", password: "reading1", password_confirmation: "reading2" }))).toEqual({
      path: "password_confirmation",
      message: "The passwords don't match.",
    });
  });

  it("validates email and the 6-digit code", () => {
    expect(firstError(loginSchema.safeParse({ email: "nope", password: "x" }))?.path).toBe("email");
    expect(firstError(resetPasswordSchema.safeParse({ email: "a@b.co", code: "12a456", password: "reading1", password_confirmation: "reading1" }))).toEqual({
      path: "code",
      message: "Enter the 6-digit code from the email.",
    });
  });
});
