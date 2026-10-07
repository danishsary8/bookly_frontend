import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { accountApi } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { dismissToast } from "@/stores/toast";
import { renderWithProviders } from "@/test/render";
import SecurityPage from "@/pages/account/SecurityPage";

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
const emailRow = () => screen.getByText("Email", { selector: "span" }).closest("li")!;
const notifications = () => within(screen.getByRole("region", { name: "Notifications" }));

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("customer");
});

describe("Change email", () => {
  it("sends a code to the new address with the password, then saves it", async () => {
    const user = userEvent.setup();
    const send = vi.spyOn(accountApi, "sendEmailCode").mockResolvedValue({ message: "sent", email: "new@example.com" });
    const confirm = vi.spyOn(accountApi, "confirmEmail").mockResolvedValue({ message: "ok", customer: { ...base, email: "new@example.com" } });
    page(base);

    await user.click(await within(emailRow()).findByRole("button", { name: "Change" }));
    const row = within(emailRow());
    expect(row.getByText("dara@example.com keeps working until you enter the code.")).toBeInTheDocument();
    await user.click(row.getByRole("button", { name: "Send code" }));
    expect(row.getByText("Enter your email address.")).toBeInTheDocument();
    expect(row.getByText("Enter your password.")).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();

    await user.type(row.getByLabelText("New email"), "New@Example.com");
    await user.type(row.getByLabelText("Your Bookly password"), "reading123");
    await user.click(row.getByRole("button", { name: "Send code" }));
    expect(send).toHaveBeenCalledWith({ email: "New@Example.com", password: "reading123" });

    expect(await row.findByText("new@example.com")).toBeInTheDocument();
    await user.type(row.getAllByRole("textbox")[0], "123456");
    await user.click(row.getByRole("button", { name: "Change email" }));

    expect(confirm).toHaveBeenCalledWith("123456");
    expect(await notifications().findByText("Email changed")).toBeInTheDocument();
  });

  it("shows the API's answers on the right fields", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "sendEmailCode").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "The given data was invalid.", fieldErrors: { email: ["This email is already used by another Bookly account."] } }),
    );
    page(base);

    await user.click(await within(emailRow()).findByRole("button", { name: "Change" }));
    const row = within(emailRow());
    await user.type(row.getByLabelText("New email"), "taken@example.com");
    await user.type(row.getByLabelText("Your Bookly password"), "reading123");
    await user.click(row.getByRole("button", { name: "Send code" }));

    expect(await row.findByText("This email is already used by another Bookly account.")).toBeInTheDocument();
  });

  it("lets a phone-only account add an email without a password", async () => {
    const user = userEvent.setup();
    const customer: Customer = { ...base, email: null, email_verified: false, has_password: false, connected: { google: false, facebook: true }, sign_in_methods: ["facebook"] };
    const send = vi.spyOn(accountApi, "sendEmailCode").mockResolvedValue({ message: "sent", email: "dara@example.com" });
    vi.spyOn(accountApi, "confirmEmail").mockResolvedValue({ message: "ok", customer: { ...customer, email: "dara@example.com", email_verified: true } });
    page(customer);

    await user.click(await within(emailRow()).findByRole("button", { name: "Add" }));
    const row = within(emailRow());
    expect(row.queryByLabelText("Your Bookly password")).not.toBeInTheDocument();
    await user.type(row.getByLabelText("Email"), "dara@example.com");
    await user.click(row.getByRole("button", { name: "Send code" }));
    expect(send).toHaveBeenCalledWith({ email: "dara@example.com" });

    await user.type((await row.findAllByRole("textbox"))[0], "654321");
    await user.click(row.getByRole("button", { name: "Add email" }));
    expect(await notifications().findByText("Email added")).toBeInTheDocument();
  });

  it("keeps the code step open on a wrong code", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "sendEmailCode").mockResolvedValue({ message: "sent", email: "new@example.com" });
    vi.spyOn(accountApi, "confirmEmail").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "The code is invalid or has expired.", fieldErrors: { code: ["The code is invalid or has expired."] } }),
    );
    page(base);

    await user.click(await within(emailRow()).findByRole("button", { name: "Change" }));
    const row = within(emailRow());
    await user.type(row.getByLabelText("New email"), "new@example.com");
    await user.type(row.getByLabelText("Your Bookly password"), "reading123");
    await user.click(row.getByRole("button", { name: "Send code" }));
    await user.type((await row.findAllByRole("textbox"))[0], "000000");
    await user.click(row.getByRole("button", { name: "Change email" }));

    expect(await row.findByText("The code is invalid or has expired.")).toBeInTheDocument();
    await user.click(row.getByRole("button", { name: "Use another email" }));
    expect(row.getByLabelText("New email")).toBeInTheDocument();
  });
});
