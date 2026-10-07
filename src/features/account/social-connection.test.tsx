import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { accountApi } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { dismissToast } from "@/stores/toast";
import { renderWithProviders } from "@/test/render";
import SecurityPage from "@/pages/account/SecurityPage";

const social = vi.hoisted(() => ({ enabled: true, token: vi.fn<() => Promise<string>>() }));
vi.mock("@/features/auth/social", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/social")>();
  return {
    ...actual,
    socialEnabled: () => social.enabled,
    prepare: () => Promise.resolve(),
    isReady: () => true,
    requestToken: () => social.token(),
  };
});

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

const page = (customer: Customer) => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(accountApi, "me").mockResolvedValue(customer);
  return renderWithProviders(
    <>
      <SecurityPage />
      <Toaster />
    </>,
  );
};
const row = (name: string) => screen.getByText(name, { selector: "span" }).closest("li")!;
const notifications = () => within(screen.getByRole("region", { name: "Notifications" }));

beforeEach(() => {
  social.enabled = true;
  social.token.mockResolvedValue("provider-token");
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("customer");
});

describe("Connect Google / Facebook", () => {
  it("asks for the password, opens Google, and shows it connected", async () => {
    const user = userEvent.setup();
    const connected: Customer = { ...base, connected: { google: true, facebook: false }, sign_in_methods: ["password", "google"] };
    const connect = vi.spyOn(accountApi, "connect").mockResolvedValue({ message: "Google connected.", customer: connected });
    page(base);

    await user.click(within(row("Google")).getByRole("button", { name: "Connect" }));
    const dialog = await screen.findByRole("dialog", { name: "Connect Google" });
    await user.click(within(dialog).getByRole("button", { name: "Continue with Google" }));
    expect(within(dialog).getByText("Enter your password.")).toBeInTheDocument();
    expect(social.token).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Your Bookly password"), "reading123");
    await user.click(within(dialog).getByRole("button", { name: "Continue with Google" }));

    expect(connect).toHaveBeenCalledWith("google", { access_token: "provider-token", password: "reading123" });
    expect(await notifications().findByText("Google connected")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts a wrong password on its field and keeps the dialog open", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "connect").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "That password is incorrect.", fieldErrors: { password: ["That password is incorrect."] } }),
    );
    page(base);

    await user.click(within(row("Facebook")).getByRole("button", { name: "Connect" }));
    const dialog = await screen.findByRole("dialog", { name: "Connect Facebook" });
    await user.type(within(dialog).getByLabelText("Your Bookly password"), "nope");
    await user.click(within(dialog).getByRole("button", { name: "Continue with Facebook" }));

    expect(await within(dialog).findByText("That password is incorrect.")).toBeInTheDocument();
  });

  it("says when the provider account belongs to someone else", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "connect").mockRejectedValue(new ApiError({ kind: "conflict", status: 409, message: "This Google account is already used by another Bookly account." }));
    page(base);

    await user.click(within(row("Google")).getByRole("button", { name: "Connect" }));
    const dialog = await screen.findByRole("dialog", { name: "Connect Google" });
    await user.type(within(dialog).getByLabelText("Your Bookly password"), "reading123");
    await user.click(within(dialog).getByRole("button", { name: "Continue with Google" }));

    expect(await within(dialog).findByText("This Google account is already used by another Bookly account.")).toBeInTheDocument();
  });

  it("connects straight away for accounts without a password", async () => {
    const user = userEvent.setup();
    const customer: Customer = { ...base, has_password: false, connected: { google: false, facebook: true }, sign_in_methods: ["facebook"] };
    const connect = vi.spyOn(accountApi, "connect").mockResolvedValue({ message: "ok", customer: { ...customer, connected: { google: true, facebook: true } } });
    page(customer);

    await user.click(within(row("Google")).getByRole("button", { name: "Connect" }));

    expect(connect).toHaveBeenCalledWith("google", { access_token: "provider-token" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says nothing when the customer closes the popup", async () => {
    const user = userEvent.setup();
    const { SocialCancelled } = await import("@/features/auth/social");
    social.token.mockRejectedValue(new SocialCancelled("closed"));
    const connect = vi.spyOn(accountApi, "connect");
    page({ ...base, has_password: false, connected: { google: false, facebook: true }, sign_in_methods: ["facebook"] });

    await user.click(within(row("Google")).getByRole("button", { name: "Connect" }));

    expect(connect).not.toHaveBeenCalled();
    expect(notifications().queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides Connect while the provider isn't set up", async () => {
    social.enabled = false;
    page(base);
    expect(await screen.findAllByText("Not connected")).toHaveLength(2);
    expect(within(row("Google")).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Disconnect Google / Facebook", () => {
  it("confirms, disconnects and updates the signed-in user", async () => {
    const user = userEvent.setup();
    const customer: Customer = { ...base, connected: { google: true, facebook: false }, sign_in_methods: ["password", "google"] };
    vi.spyOn(accountApi, "disconnect").mockImplementation(async () => {
      setSession("customer", { token: "t", expiresAt: null, user: base });
      return { message: "Google disconnected.", customer: base };
    });
    page(customer);

    await user.click(within(row("Google")).getByRole("button", { name: "Disconnect" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Disconnect Google?" });
    await user.click(within(dialog).getByRole("button", { name: "Disconnect Google" }));

    expect(await notifications().findByText("Google disconnected")).toBeInTheDocument();
    expect(getSession<Customer>("customer")?.user.connected?.google).toBe(false);
  });

  it("never offers to remove the last way in", async () => {
    page({ ...base, has_password: false, connected: { google: true, facebook: false }, sign_in_methods: ["google"] });

    const google = row("Google");
    expect(await within(google).findByText(/Google is your only way in/)).toBeInTheDocument();
    expect(within(google).getByRole("link", { name: "Add a password first" })).toHaveAttribute("href", "#password");
    expect(within(google).queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
  });

  it("shows the API's refusal in the dialog", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "disconnect").mockRejectedValue(new ApiError({ kind: "validation", status: 422, message: "Add a password first, so you can still sign in." }));
    page({ ...base, connected: { google: false, facebook: true }, sign_in_methods: ["password", "facebook"] });

    await user.click(within(row("Facebook")).getByRole("button", { name: "Disconnect" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Disconnect Facebook" }));

    expect(await within(dialog).findByText("Add a password first, so you can still sign in.")).toBeInTheDocument();
  });
});
