import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { accountApi } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { renderWithProviders } from "@/test/render";
import SecurityPage from "@/pages/account/SecurityPage";

/* Security review 2026-10-15: a new number is a new way into the account, so the owner proves it's them. */

const base: Customer = {
  id: 1,
  name: "Sok Dara",
  email: "dara@example.com",
  email_verified: true,
  verified: true,
  has_password: true,
  connected: { google: false, facebook: false },
  sign_in_methods: ["password"],
};
const link = { url: "https://t.me/BooklyBot?start=abc", key: "k", expires_at: new Date(Date.now() + 600_000).toISOString() };

const page = (customer: Customer) => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(accountApi, "me").mockResolvedValue(customer);
  vi.spyOn(authApi, "options").mockResolvedValue({ telegram: true });
  vi.spyOn(authApi.telegram, "status").mockResolvedValue({ status: "pending" } as never);
  return renderWithProviders(<SecurityPage />);
};
const phoneRow = () => within(screen.getByText("Phone", { selector: "span" }).closest("li")!);

afterEach(() => {
  vi.restoreAllMocks();
  clearSession("customer");
});

describe("Changing the phone number", () => {
  it("asks a verified account for its password before making the Telegram link", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(authApi.telegram, "confirmPhone").mockResolvedValue(link);
    page(base);

    await user.click(await phoneRow().findByRole("button", { name: "Confirm" }));
    expect(phoneRow().getByText("A new number can sign in to your account, so type your password first.")).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();

    await user.type(phoneRow().getByLabelText("Your Bookly password"), "reading123");
    await user.click(phoneRow().getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith("reading123"));
  });

  it("shows a wrong password on the field, and asks an old password-less session to sign in again", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi.telegram, "confirmPhone").mockRejectedValueOnce(
      new ApiError({ kind: "validation", status: 422, message: "That password is incorrect.", fieldErrors: { password: ["That password is incorrect."] } }),
    );
    page(base);
    await user.click(await phoneRow().findByRole("button", { name: "Confirm" }));
    await user.type(phoneRow().getByLabelText("Your Bookly password"), "nope");
    await user.click(phoneRow().getByRole("button", { name: "Continue" }));
    expect(await phoneRow().findByText("That password is incorrect.")).toBeInTheDocument();
    expect(phoneRow().getByLabelText("Your Bookly password")).toBeInTheDocument();
  });

  it("offers Sign in again when the API says the sign-in is too old", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi.telegram, "confirmPhone").mockRejectedValue(
      new ApiError({ kind: "forbidden", status: 403, message: "For your safety, sign in again first, then try this within 10 minutes.", data: { reason: "sign_in_again" } }),
    );
    page({ ...base, has_password: false, connected: { google: true, facebook: false }, sign_in_methods: ["google"] });

    await user.click(await phoneRow().findByRole("button", { name: "Confirm" }));
    expect(await phoneRow().findByText("For your safety, sign in again first, then try this within 10 minutes.")).toBeInTheDocument();
    expect(phoneRow().getByRole("button", { name: "Sign in again" })).toBeInTheDocument();
  });
});
