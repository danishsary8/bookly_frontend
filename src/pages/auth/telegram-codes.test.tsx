import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import type { FacebookSignUpState } from "@/features/auth/SocialButtons";
import { GuestOnly, RequireCustomer } from "@/routes/guards";
import { renderWithProviders } from "@/test/render";
import FacebookSignUpPage from "./FacebookSignUpPage";
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
    { route: state ? { pathname: route, state } as unknown as string : route },
  );

const telegramOn = () => vi.spyOn(api, "get").mockImplementation(async (url: string) => (url === "/auth/options" ? { telegram_codes: true } : {}));
const pending = { id: 42, name: "Sok Dara", email: "dara@example.com", phone: "+855 12 345 678", email_verified: false, phone_verified: false, verified: false };

beforeEach(() => clearSession("customer"));
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("Telegram codes", () => {
  it("lets a new customer get their code in Telegram, and fills in the library card as they type", async () => {
    const user = userEvent.setup();
    telegramOn();
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, verify_by: "telegram", customer: pending });
    app("/register");

    await user.click(await screen.findByRole("radio", { name: /Telegram/ }));
    await user.type(screen.getByLabelText("Full name"), "Sok Dara");
    expect(document.querySelector(".library-card")).toHaveTextContent("Sok Dara");
    await user.type(screen.getByLabelText("Email"), "dara@example.com");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your phone number.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Phone number with Telegram/), "012 345 678");
    expect(document.querySelector(".library-card")).toHaveTextContent("012 345 678");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "reading123");
    await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), "reading123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=telegram"));
    expect(post).toHaveBeenCalledWith("/auth/register", expect.objectContaining({ verify_by: "telegram", phone: "012 345 678" }));
    expect(screen.getByRole("heading", { level: 1, name: "Check Telegram" })).toBeInTheDocument();
  });

  it("hides the choice while the API can't send Telegram codes", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ telegram_codes: false });
    app("/register");
    expect(await screen.findByLabelText(/^Phone/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Telegram/ })).not.toBeInTheDocument();
  });

  it("checks a Telegram code with verify-phone, and can switch to email", async () => {
    const user = userEvent.setup();
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    const post = vi
      .spyOn(api, "post")
      .mockResolvedValueOnce({ message: "If your email is not verified yet, a new code has been sent." })
      .mockResolvedValueOnce({ message: "Email verified.", customer: { ...pending, email_verified: true, verified: true } });
    app("/verify-email?via=telegram&next=%2Fcart");

    expect(screen.getByText("+855 12 345 678", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send it by email instead" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=email&next=%2Fcart"));
    expect(post).toHaveBeenCalledWith("/auth/resend-verification", { channel: "email" });
    expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.paste("123456");
    await user.click(screen.getByRole("button", { name: /Verify and continue/ }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/cart"), { timeout: 3000 });
    expect(post).toHaveBeenLastCalledWith("/auth/verify-email", { code: "123456" });
  });

  it("verifies the phone and stamps the card", async () => {
    const user = userEvent.setup();
    setSession("customer", { token: "t", expiresAt: null, user: pending });
    vi.spyOn(api, "post").mockResolvedValue({ message: "Phone number verified.", customer: { ...pending, phone_verified: true, verified: true } });
    app("/verify-email?via=telegram");

    await user.click(screen.getByLabelText("Digit 1 of 6"));
    await user.paste("654321");
    await user.click(screen.getByRole("button", { name: /Verify and continue/ }));
    expect(api.post).toHaveBeenCalledWith("/auth/verify-phone", { code: "654321" });
    await waitFor(() => expect(document.querySelector(".library-stamp")).toBeInTheDocument());
    expect(getSession<{ verified: boolean }>("customer")?.user.verified).toBe(true);
  });
});

describe("Facebook sign-up", () => {
  const state: FacebookSignUpState = { accessToken: "fb-token", profile: { name: "Sok Dara", email: "sok@gmail.com" }, telegramCodes: true, next: "/cart" };

  it("asks for the phone number, keeps Facebook's email as optional, and goes to the Telegram code", async () => {
    const user = userEvent.setup();
    const post = vi.spyOn(api, "post").mockResolvedValue({
      token: "tok",
      expires_at: null,
      verify_by: "telegram",
      customer: { ...pending, email: "sok@gmail.com", email_verified: true, verified: true },
    });
    app("/sign-up/facebook", state);

    expect(screen.getByRole("heading", { level: 1, name: "Add your phone number" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toHaveValue("sok@gmail.com");
    await user.click(screen.getByRole("button", { name: "Finish signing up" }));
    expect(await screen.findByText("Enter your phone number.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Phone number"), "012 345 678");
    await user.click(screen.getByRole("button", { name: "Finish signing up" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/verify-email?via=telegram&optional=1&next=%2Fcart"));
    expect(post).toHaveBeenCalledWith("/auth/social/facebook", { access_token: "fb-token", phone: "012 345 678", email: "sok@gmail.com" });
    expect(screen.getByRole("link", { name: "Skip for now" })).toHaveAttribute("href", "/cart");
  });

  it("shows the API's answer on the field it belongs to", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "x", fieldErrors: { phone: ["This number is already on another Bookly account."] } }),
    );
    app("/sign-up/facebook", { ...state, profile: { name: "Sok Dara", email: null } });
    expect(screen.getByLabelText(/Email/)).toHaveValue("");
    await user.type(screen.getByLabelText("Phone number"), "012 345 678");
    await user.click(screen.getByRole("button", { name: "Finish signing up" }));
    expect(await screen.findByText("This number is already on another Bookly account.")).toBeInTheDocument();
  });

  it("starts over from sign-up when opened without Facebook's answer", () => {
    app("/sign-up/facebook");
    expect(screen.getByTestId("where")).toHaveTextContent("/register");
  });
});
