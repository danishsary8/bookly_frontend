import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { SESSION_EXPIRED_EVENT, api } from "@/api/client";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { SessionWatcher } from "@/features/auth/SessionWatcher";
import { GuestOnly, RequireCustomer, RequireVerified } from "@/routes/guards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import ForgotPasswordPage from "./ForgotPasswordPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ResetPasswordPage from "./ResetPasswordPage";
import VerifyEmailPage from "./VerifyEmailPage";

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<RequireCustomer />}>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/profile" element={<h1>Profile</h1>} />
        </Route>
        <Route element={<RequireVerified />}>
          <Route path="/checkout" element={<h1>Checkout</h1>} />
        </Route>
        <Route path="*" element={<h1>Elsewhere</h1>} />
      </Routes>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
      <SessionWatcher />
      <Toaster />
    </>,
    { route },
  );

const customer = (verified: boolean) => ({ id: 5, name: "Sok Dara", email: "dara@example.com", email_verified: verified });
const signIn = (verified = true) => setSession("customer", { token: "t", expiresAt: null, user: customer(verified) });
const passwordInput = (name: string) => screen.getByLabelText(name, { selector: "input" });

beforeEach(() => clearSession("customer"));
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  sessionStorage.clear();
});

describe("LoginPage", () => {
  it("signs in and returns to a safe ?next=", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, customer: customer(true) });
    app("/login?next=%2Fbooks%2F7");
    await user.type(screen.getByLabelText("Email"), "dara@example.com");
    await user.type(passwordInput("Password"), "reading123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/books/7"));
    expect(post).toHaveBeenCalledWith("/auth/login", { email: "dara@example.com", password: "reading123" });
    expect(getSession("customer")?.token).toBe("tok");
  });

  it("shows the API's message and clears the password on a wrong password", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValue(new ApiError({ kind: "unauthenticated", status: 401, message: "Invalid email or password." }));
    app("/login");
    await user.type(screen.getByLabelText("Email"), "dara@example.com");
    await user.type(passwordInput("Password"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(passwordInput("Password")).toHaveValue("");
  });

  it("validates before sending anything", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post");
    app("/login");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends unverified customers to email verification, keeping next", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, customer: customer(false) });
    app("/login?next=%2Fcheckout");
    await user.type(screen.getByLabelText("Email"), "dara@example.com");
    await user.type(passwordInput("Password"), "reading123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=email&next=%2Fcheckout"));
  });
});

describe("RegisterPage", () => {
  it("puts the API's duplicate-email error on the email field", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "The email has already been taken.", fieldErrors: { email: ["The email has already been taken."] } }),
    );
    app("/register");
    await user.type(screen.getByLabelText("Full name"), "Sok Dara");
    await user.type(screen.getByLabelText("Email"), "dara@example.com");
    await user.type(passwordInput("Password"), "reading123");
    await user.type(passwordInput("Confirm password"), "reading123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("The email has already been taken.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("VerifyEmailPage", () => {
  it("shows a wrong code on the code cells, then verifies and continues", async () => {
    const user = userEvent.setup();
    signIn(false);
    const post = vi
      .spyOn(api, "post")
      .mockRejectedValueOnce(new ApiError({ kind: "validation", status: 422, message: "The code is invalid or has expired." }))
      .mockResolvedValueOnce({ message: "Email verified.", customer: customer(true) });
    app("/verify-email?next=%2Fbooks%2F7");
    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.paste("123456");
    await user.click(screen.getByRole("button", { name: /Verify and continue/ }));
    expect(await screen.findByText("The code is invalid or has expired.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Verify and continue/ }));
    expect(await screen.findByRole("button", { name: /Stamping your card/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/books/7"), { timeout: 3000 });
    expect(post).toHaveBeenLastCalledWith("/auth/verify-email", { code: "123456" });
    expect(getSession<{ email_verified: boolean }>("customer")?.user.email_verified).toBe(true);
  });
});

describe("password reset", () => {
  it("requests a code, then resets and returns to sign-in with a notice", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockResolvedValue({ message: "ok" });
    app("/forgot-password");
    await user.type(screen.getByLabelText("Email"), "dara@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Set a new password" })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/auth/forgot-password", { email: "dara@example.com" });

    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.paste("654321");
    await user.type(passwordInput("New password"), "newreading4");
    await user.type(passwordInput("Confirm new password"), "newreading4");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByText("Password updated. Sign in with your new password.")).toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith("/auth/reset-password", { email: "dara@example.com", code: "654321", password: "newreading4", password_confirmation: "newreading4" });
    expect(screen.getByLabelText("Email")).toHaveValue("dara@example.com");
  });
});

describe("route guards", () => {
  it("sends signed-out visitors to sign in with the page they wanted", () => {
    app("/profile?tab=a");
    expect(screen.getByTestId("where")).toHaveTextContent("/login?next=%2Fprofile%3Ftab%3Da");
  });

  it("sends unverified customers from verified-only pages to verification", () => {
    signIn(false);
    app("/checkout");
    expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?next=%2Fcheckout");
  });

  it("keeps signed-in customers away from the sign-in pages", () => {
    signIn(true);
    app("/login?next=%2Fprofile");
    expect(screen.getByTestId("where")).toHaveTextContent("/profile");
  });
});

describe("SessionWatcher", () => {
  it("tells the customer once that their session ended, with a sign-in link back", async () => {
    app("/elsewhere");
    act(() => {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { kind: "customer" } }));
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { kind: "customer" } }));
    });
    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findAllByText("You've been signed out")).toHaveLength(1);
    expect(within(notifications).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Felsewhere");
  });
});
