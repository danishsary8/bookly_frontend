import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { ApiError } from "@/api/errors";
import { clearSession, getSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { RESEND_SECONDS } from "@/features/auth/PhoneCodeSignIn";
import { setLanguage } from "@/i18n";
import { GuestOnly } from "@/routes/guards";
import { renderWithProviders } from "@/test/render";
import LoginPage from "./LoginPage";

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
};

const app = () =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route path="*" element={<h1>Elsewhere</h1>} />
      </Routes>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>,
    { route: "/login" },
  );

const dara: Customer = { id: 42, name: "Sok Dara", email: null, phone: "+855 12 345 678", email_verified: false, phone_verified: true, verified: true };
const SENT = { message: "If this number has a Bookly account linked to Telegram, we sent a sign-in code there.", expires_in_minutes: 10 };
const wrong = new ApiError({ kind: "validation", status: 422, message: "That code is wrong or has expired.", fieldErrors: { code: ["That code is wrong or has expired."] } });

beforeEach(() => {
  clearSession("customer");
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(api, "get").mockImplementation(async (url: string) => (url === "/auth/options" ? { telegram: true } : {}));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function openPhoneSignIn() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  app();
  await user.click(await screen.findByRole("button", { name: "Sign in with phone number?" }));
  return user;
}

const typeCode = async (user: ReturnType<typeof userEvent.setup>, code: string) => {
  await user.click(screen.getByLabelText("Digit 1 of 6"));
  await user.keyboard(code);
};

describe("Sign in with a code from Telegram", () => {
  it("sends a code to the number, then signs in with it", async () => {
    const post = vi.spyOn(api, "post").mockImplementation(async (url: string) => {
      if (url === "/auth/phone/code") return SENT;
      if (url === "/auth/phone/verify") return { customer: dara, token: "tok", token_type: "Bearer", expires_at: null };
      throw new Error(`unexpected ${url}`);
    });
    const user = await openPhoneSignIn();

    await user.type(screen.getByLabelText("Phone number"), "012 345 678");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));

    expect(post).toHaveBeenCalledWith("/auth/phone/code", { phone: "012 345 678" });
    expect(await screen.findByText(/If 012 345 678 has a Bookly account linked to Telegram/)).toBeInTheDocument();
    await typeCode(user, "482913");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(post).toHaveBeenCalledWith("/auth/phone/verify", { phone: "012 345 678", code: "482913" });
    expect(await screen.findByTestId("where")).not.toHaveTextContent("/login");
    expect(getSession("customer")?.token).toBe("tok");
  });

  it("keeps the one-tap Telegram sign-in as a backup", async () => {
    await openPhoneSignIn();
    expect(screen.getByText("No message from the bot? Sign in with one tap instead:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Telegram" })).toBeInTheDocument();
  });

  it("explains under the field that codes only go to a confirmed number, and how to confirm it", async () => {
    await openPhoneSignIn();
    expect(screen.getByLabelText("Phone number")).toHaveAccessibleDescription(
      "Codes only go to a confirmed number. Not confirmed yet? Use Continue with Telegram below, or confirm it in Account → Sign-in & security → Phone → Confirm.",
    );
  });

  it("clears the error and brings the hint back once a wrong number is fixed, without pressing Send again", async () => {
    const post = vi.spyOn(api, "post");
    const user = await openPhoneSignIn();
    const field = screen.getByLabelText("Phone number");

    await user.type(field, "123");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a Cambodian phone number, like 012 345 678.");

    await user.clear(field);
    await user.type(field, "012 345 678");
    expect(field).not.toHaveAttribute("aria-invalid");
    expect(field).toHaveAccessibleDescription(/^Codes only go to a confirmed number\./);
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the hint in Khmer", async () => {
    setLanguage("km");
    try {
      app();
      const toggle = await screen.findByRole("button", { name: "ចូលដោយប្រើលេខទូរសព្ទ?" });
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(toggle);
      expect(screen.getByLabelText("លេខទូរសព្ទ")).toHaveAccessibleDescription(/^លេខកូដផ្ញើទៅតែលេខដែលបានបញ្ជាក់ប៉ុណ្ណោះ។/);
    } finally {
      setLanguage("en");
    }
  });

  it("checks the number before asking the API", async () => {
    const post = vi.spyOn(api, "post");
    const user = await openPhoneSignIn();

    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));
    expect(screen.getByLabelText("Phone number")).toHaveAccessibleDescription(/phone number/i);

    await user.type(screen.getByLabelText("Phone number"), "+66 81 234 5678");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));
    expect(post).not.toHaveBeenCalled();
  });

  it("says a wrong code plainly and lets the customer try again", async () => {
    vi.spyOn(api, "post").mockImplementation(async (url: string) => {
      if (url === "/auth/phone/code") return SENT;
      throw wrong;
    });
    const user = await openPhoneSignIn();
    await user.type(screen.getByLabelText("Phone number"), "012345678");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));
    await typeCode(user, "000000");
    await user.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("That code is wrong or has expired. Check the latest message from the Bookly bot, or send a new code.")).toBeInTheDocument();
    expect(screen.getByLabelText("Digit 1 of 6")).toHaveValue("");
    expect(getSession("customer")).toBeNull();
  });

  it("waits a minute before a new code, then sends one; the number can be changed", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(SENT);
    const user = await openPhoneSignIn();
    await user.type(screen.getByLabelText("Phone number"), "012345678");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));

    const resend = await screen.findByRole("button", { name: `Resend code in ${RESEND_SECONDS}s` });
    expect(resend).toBeDisabled();
    for (let i = 0; i < RESEND_SECONDS; i++) await act(() => vi.advanceTimersByTimeAsync(1000));
    await user.click(await screen.findByRole("button", { name: "Resend code" }));
    expect(post).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Use another number" }));
    expect(screen.getByLabelText("Phone number")).toHaveValue("012345678");
  });

  it("shows the API's answer when there were too many codes for the number", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new ApiError({ kind: "rate_limited", status: 429, message: "A code was just sent to this number. Please wait a minute before asking for another." }));
    const user = await openPhoneSignIn();
    await user.type(screen.getByLabelText("Phone number"), "012345678");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));

    expect(await screen.findByText("A code was just sent to this number. Please wait a minute before asking for another.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Digit 1 of 6")).not.toBeInTheDocument();
  });

  it("points to the one-tap button while the API has no code sign-in yet", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    const user = await openPhoneSignIn();
    await user.type(screen.getByLabelText("Phone number"), "012345678");
    await user.click(screen.getByRole("button", { name: "Send code in Telegram" }));

    expect(await screen.findByText("Sign-in codes aren't available yet. Use Continue with Telegram below.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Telegram" })).toBeInTheDocument();
  });
});
