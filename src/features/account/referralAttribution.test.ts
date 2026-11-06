import { beforeEach, expect, it } from "vitest";
import { referralDevice, referralSignup, rememberReferral } from "./referralAttribution";

beforeEach(() => localStorage.clear());
it("keeps a valid referral for thirty days and never extends it just by reading", () => {
  rememberReferral("?ref=ABCDEF1234567890", 1000);
  expect(referralSignup(2000).referral_code).toBe("ABCDEF1234567890");
  expect(referralSignup(1000 + 30 * 86400000).referral_code).toBeUndefined();
});
it("rejects malformed links and damaged storage without breaking signup", () => {
  rememberReferral("?ref=<script>");
  expect(referralSignup().referral_code).toBeUndefined();
  localStorage.setItem("bookly:referral", "bad json");
  expect(() => referralSignup()).not.toThrow();
});
it("keeps one browser device identifier for signup and sharing", () => {
  expect(referralSignup().referral_device).toBe(referralDevice());
  expect(referralDevice()).toMatch(/^[a-zA-Z0-9_-]{16,64}$/);
});
