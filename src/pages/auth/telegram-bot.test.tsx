import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { api } from "@/api/client";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import type { Customer } from "@/api/types";
import type { FacebookSignUpState } from "@/features/auth/SocialButtons";
import { POLL_MS } from "@/features/auth/telegram";
import SecurityPage from "@/pages/account/SecurityPage";
import { GuestOnly, RequireCustomer } from "@/routes/guards";
import { renderWithProviders } from "@/test/render";
import FacebookSignUpPage from "./FacebookSignUpPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import VerifyEmailPage from "./VerifyEmailPage";

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const app = (route: string, state?: FacebookSignUpState) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-up/facebook" element={<FacebookSignUpPage />} />
        </Route>
        <Route element={<RequireCustomer />}>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>
        <Route path="*" element={<h1>Elsewhere</h1>} />
      </Routes>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>,
    { route: state ? ({ pathname: route, state } as unknown as string) : route },
  );

const LINK = { url: "https://t.me/BooklyBot?start=abc", key: "secret-key", expires_at: new Date(Date.now() + 600_000).toISOString() };
const bot = (on = true) => vi.spyOn(api, "get").mockImplementation(async (url: string) => (url === "/auth/options" ? { telegram: on } : {}));
const pending: Customer = { id: 42, name: "Sok Dara", email: null, phone: null, email_verified: false, phone_verified: false, verified: false };
const confirmed: Customer = { ...pending, phone: "+855 12 345 678", phone_number: "+85512345678", phone_verified: true, verified: true };

/** The API: the link, then `statuses` in turn for each status check (the last one repeats). */
function telegramApi(statuses: unknown[], extra: Record<string, unknown> = {}) {
  let n = 0;
  return vi.spyOn(api, "post").mockImplementation(async (url: string) => {
    if (url === "/auth/telegram" || url === "/auth/telegram/phone") return LINK;
    if (url === "/auth/telegram/status") {
      const next = statuses[Math.min(n++, statuses.length - 1)];
      if (next instanceof Error) throw next;
      return next;
    }
    if (url in extra) return extra[url];
    throw new Error(`unexpected ${url}`);
  });
}

const tick = () => act(() => vi.advanceTimersByTimeAsync(POLL_MS));

beforeEach(() => {
  clearSession("customer");
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("Sign-up with Telegram", () => {
  it("needs no phone number or email, then opens the Telegram step", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    bot();
    const post = telegramApi([{ status: "pending" }], { "/auth/register": { token: "tok", expires_at: null, verify_by: "telegram", customer: pending } });
    app("/register");

    await user.click(await screen.findByRole("radio", { name: /Telegram/ }));
    expect(screen.queryByLabelText(/^Phone/)).not.toBeInTheDocument();
    expect(screen.getByText("(optional)", { selector: "label span" })).toBeInTheDocument();
    expect(document.querySelector(".library-card")).toHaveTextContent("Confirm withTelegram");
    await user.type(screen.getByLabelText("Full name"), "Sok Dara");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "reading123");
    await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), "reading123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=telegram"));
    const body = post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toMatchObject({ verify_by: "telegram" });
    expect(body).not.toHaveProperty("phone");
    expect(body).not.toHaveProperty("email");
    expect(screen.getByRole("heading", { level: 1, name: "Confirm your phone number" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Open Telegram" })).toHaveAttribute("href", LINK.url);
  });

  it("still needs the email when confirming by email, and hides Telegram while the bot is off", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    bot(false);
    const post = vi.spyOn(api, "post");
    app("/register");

    expect(await screen.findByLabelText(/^Phone/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Telegram/ })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Full name"), "Sok Dara");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "reading123");
    await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), "reading123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});

describe("Confirm your phone number in Telegram", () => {
  it("makes the link at once, waits for Telegram, then stamps the card and carries on", async () => {
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    const post = telegramApi([{ status: "pending" }, { status: "done", customer: confirmed }]);
    app("/verify-email?via=telegram&next=%2Fcart");

    expect(await screen.findByRole("link", { name: "Open Telegram" })).toHaveAttribute("target", "_blank");
    expect(post).toHaveBeenCalledWith("/auth/telegram/phone");
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for Telegram…");

    await tick();
    expect(post).toHaveBeenCalledWith("/auth/telegram/status", { key: "secret-key" });
    expect(document.querySelector(".library-stamp")).not.toBeInTheDocument();
    await tick();
    await waitFor(() => expect(document.querySelector(".library-stamp")).toBeInTheDocument());
    expect(getSession<Customer>("customer")?.user.phone_verified).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/cart"));
  });

  it("asks again at once when the customer comes back from Telegram", async () => {
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    const post = telegramApi([{ status: "pending" }]);
    app("/verify-email?via=telegram");
    await screen.findByRole("link", { name: "Open Telegram" });

    await act(async () => {}); // the page starts listening once it has rendered
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/auth/telegram/status", { key: "secret-key" }));
  });

  it("says why it didn't work and can try again", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    const post = telegramApi([{ status: "failed", message: "This number is already on another Bookly account. Sign in with Telegram instead." }]);
    app("/verify-email?via=telegram");
    await screen.findByRole("link", { name: "Open Telegram" });

    await tick();
    expect(await screen.findByRole("alert")).toHaveTextContent("already on another Bookly account");
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(await screen.findByRole("link", { name: "Open Telegram" })).toBeInTheDocument();
    expect(post.mock.calls.filter(([url]) => url === "/auth/telegram/phone")).toHaveLength(2);
  });

  it("treats an expired link as expired", async () => {
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    telegramApi([new ApiError({ kind: "not_found", status: 404, message: "This Telegram link has expired. Please try again." })]);
    app("/verify-email?via=telegram");
    await screen.findByRole("link", { name: "Open Telegram" });

    await tick();
    expect(await screen.findByRole("alert")).toHaveTextContent("This Telegram link has expired. Please try again.");
  });

  it("offers an email code instead when the account has an unconfirmed email", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setSession("customer", { token: "t", expiresAt: null, user: { ...pending, email: "dara@example.com" } });
    const post = telegramApi([{ status: "pending" }], { "/auth/resend-verification": { message: "sent" } });
    app("/verify-email?via=telegram&next=%2Fcart");

    await user.click(await screen.findByRole("button", { name: "Get a code by email instead" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=email&next=%2Fcart"));
    expect(post).toHaveBeenCalledWith("/auth/resend-verification", {});
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument();
  });

  it("has no email way out for phone-only accounts", async () => {
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    telegramApi([{ status: "pending" }]);
    app("/verify-email?via=telegram");
    await screen.findByRole("link", { name: "Open Telegram" });
    expect(screen.queryByRole("button", { name: "Get a code by email instead" })).not.toBeInTheDocument();
  });
});

describe("Continue with Telegram", () => {
  it("opens the bot and signs in once the number is shared", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    bot();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const post = telegramApi([{ status: "pending" }, { status: "done", customer: confirmed, token: "tok", token_type: "Bearer", expires_at: null }]);
    app("/login?next=%2Fcart");

    await user.click(await screen.findByRole("button", { name: "Continue with Telegram" }));
    expect(post).toHaveBeenCalledWith("/auth/telegram");
    expect(open).toHaveBeenCalledWith(LINK.url, "_blank", "noopener");
    expect(screen.getByRole("link", { name: "Open Telegram" })).toHaveAttribute("href", LINK.url);

    await tick();
    await tick();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/cart"));
    expect(getSession<Customer>("customer")?.token).toBe("tok");
  });

  it("explains when no account has the number, and can be cancelled", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    bot();
    vi.spyOn(window, "open").mockReturnValue(null);
    telegramApi([{ status: "failed", message: "No Bookly account uses the number of this Telegram account (+855 12 345 678). Create an account, or sign in with your email." }]);
    app("/login");

    await user.click(await screen.findByRole("button", { name: "Continue with Telegram" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("link", { name: "Open Telegram" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue with Telegram" }));
    await tick();
    expect(await screen.findByRole("alert")).toHaveTextContent("No Bookly account uses the number");
    expect(screen.getByRole("button", { name: "Continue with Telegram" })).toBeInTheDocument();
  });

  it("isn't offered while the bot is off", async () => {
    bot(false);
    app("/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Telegram" })).not.toBeInTheDocument();
  });
});

describe("Facebook sign-up", () => {
  const state: FacebookSignUpState = { accessToken: "fb-token", profile: { name: "Sok Dara", email: "sok@gmail.com" }, telegram: true, next: "/cart" };

  it("confirms the phone in Telegram by default, keeping Facebook's email", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const post = telegramApi([{ status: "pending" }], {
      "/auth/social/facebook": { token: "tok", expires_at: null, verify_by: "telegram", customer: { ...pending, email: "sok@gmail.com", email_verified: true, verified: true } },
    });
    app("/sign-up/facebook", state);

    expect(screen.getByRole("heading", { level: 1, name: "Confirm your phone number" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Telegram/ })).toBeChecked();
    expect(screen.getByRole("textbox", { name: /^Email/ })).toHaveValue("sok@gmail.com");
    await user.click(screen.getByRole("button", { name: "Continue to Telegram" }));

    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=telegram&optional=1&next=%2Fcart"));
    expect(post).toHaveBeenCalledWith("/auth/social/facebook", { access_token: "fb-token", verify_by: "telegram", email: "sok@gmail.com" });
    expect(screen.getByRole("link", { name: "Skip for now" })).toHaveAttribute("href", "/cart");
  });

  it("needs an email without Telegram, and shows the API's answer there", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "x", fieldErrors: { email: ["This email is already used by another Bookly account."] } }),
    );
    app("/sign-up/facebook", { ...state, profile: { name: "Sok Dara", email: null } });

    await user.click(screen.getByRole("radio", { name: /Email/ }));
    await user.click(screen.getByRole("button", { name: "Finish signing up" }));
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "taken@example.com");
    await user.click(screen.getByRole("button", { name: "Finish signing up" }));
    expect(await screen.findByText("This email is already used by another Bookly account.")).toBeInTheDocument();
  });

  it("asks for an email only while the bot is off", () => {
    app("/sign-up/facebook", { ...state, telegram: false });
    expect(screen.getByRole("heading", { level: 1, name: "Add your email" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("starts over from sign-up when opened without Facebook's answer", () => {
    app("/sign-up/facebook");
    expect(screen.getByTestId("where")).toHaveTextContent("/register");
  });
});

describe("Account → Sign-in & security", () => {
  const verified: Customer = { ...confirmed, email: "dara@example.com", email_verified: true, has_password: true, connected: { google: false, facebook: false }, sign_in_methods: ["password", "telegram"] };
  const phoneRow = () => within(screen.getByText("Phone", { selector: "span" }).closest("li")!);

  it("changes the number through the bot", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    bot();
    setSession("customer", { token: "t", expiresAt: null, user: verified });
    const me = vi.spyOn(accountApi, "me").mockResolvedValue(verified);
    const post = telegramApi([{ status: "done", customer: { ...verified, phone: "+855 98 765 432" } }]);
    renderWithProviders(<SecurityPage />);

    expect(await phoneRow().findByText("You can also sign in with Continue with Telegram.")).toBeInTheDocument();
    await user.click(phoneRow().getByRole("button", { name: "Change" }));
    expect(await phoneRow().findByRole("link", { name: "Open Telegram" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/auth/telegram/phone");

    await tick();
    await waitFor(() => expect(phoneRow().queryByRole("link", { name: "Open Telegram" })).not.toBeInTheDocument());
    expect(getSession<Customer>("customer")?.user.phone).toBe("+855 98 765 432");
    expect(me.mock.calls.length).toBeGreaterThan(1);
  });
});
