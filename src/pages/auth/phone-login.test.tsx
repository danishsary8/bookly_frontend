import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { ApiError } from "@/api/errors";
import { clearSession, getSession } from "@/api/session";
import { GuestOnly } from "@/routes/guards";
import { renderWithProviders } from "@/test/render";
import LoginPage from "./LoginPage";
import PhoneLoginPage from "./PhoneLoginPage";

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
          <Route path="/login/phone" element={<PhoneLoginPage />} />
        </Route>
        <Route path="*" element={<h1>Elsewhere</h1>} />
      </Routes>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>,
    { route },
  );

const options = (telegram: boolean) => vi.spyOn(api, "get").mockImplementation(async (url: string) => (url === "/auth/options" ? { telegram_codes: telegram } : {}));
const customer = { id: 7, name: "Sok Dara", email: null, phone: "+855 12 345 678", phone_verified: true, email_verified: false, verified: true };

beforeEach(() => clearSession("customer"));
afterEach(() => vi.restoreAllMocks());

describe("Sign in with a phone number", () => {
  it("is offered on the sign-in page while Telegram codes are on, keeping ?next=", async () => {
    options(true);
    app("/login?next=%2Fcart");
    const link = await screen.findByRole("link", { name: "Sign in with a Telegram code" });
    expect(link).toHaveAttribute("href", "/login/phone?next=%2Fcart");
  });

  it("is not offered while Telegram codes are off", async () => {
    const get = options(false);
    app("/login");
    await screen.findByRole("button", { name: "Sign in" });
    await vi.waitFor(() => expect(get).toHaveBeenCalledWith("/auth/options"));
    expect(screen.queryByRole("link", { name: "Sign in with a Telegram code" })).not.toBeInTheDocument();
  });

  it("sends a code, then signs in with it and goes back to ?next=", async () => {
    const user = userEvent.setup();
    options(true);
    const post = vi.spyOn(api, "post").mockImplementation(async (url: string) =>
      url === "/auth/phone-login"
        ? { message: "We sent a 6-digit code to the Telegram of this number.", phone: "+855 12 345 678" }
        : { token: "tok", expires_at: null, customer },
    );
    app("/login/phone?next=%2Fcart");

    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(screen.getByText("Enter your phone number.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Phone number", { exact: false }), "012 345 678");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(post).toHaveBeenCalledWith("/auth/phone-login", { phone: "012 345 678" });

    expect(await screen.findByRole("heading", { name: "Check Telegram" })).toBeInTheDocument();
    expect(screen.getByText("+855 12 345 678")).toBeInTheDocument();
    await user.type(screen.getAllByRole("textbox")[0], "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(post).toHaveBeenCalledWith("/auth/phone-login/verify", { phone: "+855 12 345 678", code: "123456" });
    expect(await screen.findByTestId("where")).toHaveTextContent("/cart");
    expect(getSession("customer")?.token).toBe("tok");
  });

  it("puts a wrong code on the code boxes and lets the customer change the number", async () => {
    const user = userEvent.setup();
    options(true);
    vi.spyOn(api, "post").mockImplementation(async (url: string) => {
      if (url === "/auth/phone-login") return { message: "sent", phone: "+855 12 345 678" };
      throw new ApiError({ kind: "validation", status: 422, message: "The code is invalid or has expired.", fieldErrors: { code: ["The code is invalid or has expired."] } });
    });
    app("/login/phone");

    await user.type(screen.getByLabelText("Phone number", { exact: false }), "012345678");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type((await screen.findAllByRole("textbox"))[0], "000000");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("The code is invalid or has expired.")).toBeInTheDocument();
    expect(getSession("customer")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Use another number" }));
    expect(screen.getByRole("heading", { name: "Sign in with your phone" })).toBeInTheDocument();
  });

  it("says on the number when it has no account, and stays on the first step", async () => {
    const user = userEvent.setup();
    options(true);
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError({
        kind: "validation",
        status: 422,
        message: "The given data was invalid.",
        fieldErrors: { phone: ["We couldn't find a Bookly account with this verified number. Check the number, or sign in with your email."] },
      }),
    );
    app("/login/phone");

    await user.type(screen.getByLabelText("Phone number", { exact: false }), "096 111 2222");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText(/couldn't find a Bookly account with this verified number/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Check Telegram" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });

  it("shows the API's message on the number", async () => {
    const user = userEvent.setup();
    options(true);
    vi.spyOn(api, "post").mockRejectedValue(
      new ApiError({
        kind: "validation",
        status: 422,
        message: "The given data was invalid.",
        fieldErrors: { phone: ["This number has had 3 codes in the last hour. Try again in 40 min, or use email."] },
      }),
    );
    app("/login/phone");

    await user.type(screen.getByLabelText("Phone number", { exact: false }), "012345678");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByText("This number has had 3 codes in the last hour. Try again in 40 min, or use email.")).toBeInTheDocument();
  });
});
