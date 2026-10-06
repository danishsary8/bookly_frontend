import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { api } from "@/api/client";
import { ApiError } from "@/api/errors";
import { clearSession, getSession } from "@/api/session";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import { renderWithProviders } from "@/test/render";
import { resetSocialForTests } from "./social";

type GoogleConfig = { client_id: string; scope: string; callback: (r: { access_token?: string; error?: string }) => void; error_callback?: (e: { type: string }) => void };

const app = (route = "/login?next=%2Fcart") =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<h1>Somewhere else</h1>} />
    </Routes>,
    { route },
  );

const customer = { id: 5, name: "Sok Dara", email: "dara@example.com", email_verified: true };
let google: GoogleConfig | undefined;
const requestAccessToken = vi.fn();

function fakeGoogle() {
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => {
          google = config as GoogleConfig;
          return { requestAccessToken };
        },
      },
    },
  };
}

beforeEach(() => {
  clearSession("customer");
  google = undefined;
  requestAccessToken.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete window.google;
  delete window.FB;
  resetSocialForTests();
});

describe("social sign-in", () => {
  it("stays 'coming soon' below the form while no provider is set up", () => {
    app();
    expect(screen.getByRole("button", { name: "Google" })).toBeDisabled();
    expect(screen.getByText("Google and Facebook sign-in are coming soon.")).toBeInTheDocument();
  });

  it("signs in with Google above the email form and goes back to ?next=", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-1");
    fakeGoogle();
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, customer });
    app();
    expect(screen.queryByRole("button", { name: /Facebook/ })).not.toBeInTheDocument();
    expect(screen.getByText("or use your email")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(requestAccessToken).toHaveBeenCalled();
    expect(google).toMatchObject({ client_id: "client-1", scope: "openid email profile" });
    google!.callback({ access_token: "g-token" });

    await waitFor(() => expect(post).toHaveBeenCalledWith("/auth/social/google", { access_token: "g-token" }));
    expect(await screen.findByRole("heading", { name: "Somewhere else" })).toBeInTheDocument();
    expect(getSession("customer")?.token).toBe("tok");
  });

  it("says nothing when the popup is closed, and explains a blocked popup or the API's answer", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-1");
    fakeGoogle();
    const post = vi
      .spyOn(api, "post")
      .mockRejectedValue(new ApiError({ kind: "validation", status: 422, message: "Please verify your email address with Google first, or register with email instead." }));
    app("/register");
    const button = screen.getByRole("button", { name: "Continue with Google" });

    await userEvent.click(button);
    google!.error_callback!({ type: "popup_closed" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(button);
    google!.error_callback!({ type: "popup_failed_to_open" });
    expect(await screen.findByText("Your browser blocked the Google window. Allow pop-ups for this site, then try again.")).toBeInTheDocument();

    await userEvent.click(button);
    google!.callback({ access_token: "unverified" });
    expect(await screen.findByText(/verify your email address with Google first/)).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("tells someone whose email already has an account how to sign in instead", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-1");
    fakeGoogle();
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError({ kind: "conflict", status: 409, message: "This email already has a Bookly account. Sign in with your email and password instead." }),
    );
    app();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    google!.callback({ access_token: "g-token" });
    expect(await screen.findByText("This email already has a Bookly account. Sign in with your email and password instead.")).toBeInTheDocument();
    expect(getSession("customer")).toBeNull();
  });

  it("signs in with Facebook", async () => {
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "app-1");
    const login = vi.fn((cb: (r: { status: string; authResponse?: { accessToken: string } }) => void) => cb({ status: "connected", authResponse: { accessToken: "fb-token" } }));
    window.FB = { init: vi.fn(), login };
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, customer });
    app();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Facebook" }));
    expect(login).toHaveBeenCalledWith(expect.any(Function), { scope: "email,public_profile" });
    await waitFor(() => expect(post).toHaveBeenCalledWith("/auth/social/facebook", { access_token: "fb-token" }));
  });

  it("loads Google's script as a plain script (it has no CORS headers) and asks to try again while it loads", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-1");
    app();
    const script = document.head.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    expect(script).not.toBeNull();
    expect(script!.crossOrigin).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText("Google sign-in is still loading. Try again in a moment.")).toBeInTheDocument();
    document.head.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());
  });

  it("says when Google's script couldn't load", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-1");
    app();
    const script = document.head.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')!;
    script.dispatchEvent(new Event("error"));
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(await screen.findByText(/Google sign-in couldn't load/)).toBeInTheDocument();
    document.head.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());
  });

});
