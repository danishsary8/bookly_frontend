import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { api } from "@/api/client";
import { clearSession } from "@/api/session";
import LoginPage from "@/pages/auth/LoginPage";
import { renderWithProviders } from "@/test/render";
import { resetTurnstileForTests } from "./turnstile";

type Options = { callback: (token: string) => void; "error-callback": () => void; sitekey: string; action: string; appearance: string };

const app = () =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<h1>Signed in</h1>} />
    </Routes>,
    { route: "/login" },
  );

async function signIn() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "dara@example.com");
  await user.type(screen.getByLabelText("Password", { selector: "input" }), "reading123");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

const customer = { id: 5, name: "Sok Dara", email: "dara@example.com", email_verified: true };

beforeEach(() => clearSession("customer"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete window.turnstile;
  resetTurnstileForTests();
  document.head.querySelectorAll('script[src*="challenges.cloudflare.com"]').forEach((s) => s.remove());
});

describe("Turnstile", () => {
  it("is off without a site key: no script, no token", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, customer });
    app();
    await signIn();
    await waitFor(() => expect(post).toHaveBeenCalledWith("/auth/login", { email: "dara@example.com", password: "reading123" }));
    expect(document.head.querySelector('script[src*="challenges.cloudflare.com"]')).toBeNull();
  });

  it("sends the token with sign-in, then asks Cloudflare for a fresh one", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key");
    let options: Options | undefined;
    const reset = vi.fn();
    window.turnstile = {
      render: vi.fn((_el, o) => {
        options = o as Options;
        return "w1";
      }),
      reset,
      remove: vi.fn(),
    };
    const post = vi.spyOn(api, "post").mockResolvedValue({ token: "tok", expires_at: null, customer });
    app();
    await waitFor(() => expect(options).toBeDefined());
    expect(options).toMatchObject({ sitekey: "site-key", action: "login", appearance: "interaction-only" });

    // Submitting before the check finishes waits for its token.
    await signIn();
    expect(post).not.toHaveBeenCalled();
    options!.callback("cf-token");
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/login", { email: "dara@example.com", password: "reading123", turnstile_token: "cf-token" }),
    );
    await waitFor(() => expect(reset).toHaveBeenCalledWith("w1"));
  });

  it("explains when the check can't load", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key");
    app();
    const script = await waitFor(() => {
      const s = document.head.querySelector<HTMLScriptElement>('script[src*="challenges.cloudflare.com"]');
      expect(s).not.toBeNull();
      return s!;
    });
    script.dispatchEvent(new Event("error"));
    expect(await screen.findByText(/The security check didn't load/)).toBeInTheDocument();
  });
});
