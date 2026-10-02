import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import type { Address, Customer } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { AccountLayout } from "@/features/account/AccountLayout";
import { RequireVerified } from "@/routes/guards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import AddressesPage from "./AddressesPage";
import ProfilePage from "./ProfilePage";
import SecurityPage from "./SecurityPage";

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: "012345678", email_verified: true, has_password: true };
const home: Address = { id: 11, label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", address_line2: null, city: "Phnom Penh", state: null, postal_code: null, country: "Cambodia", is_default: true };
const work: Address = { ...home, id: 12, label: "Work", address_line1: "Building 5", is_default: false };

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireVerified />}>
          <Route path="/account" element={<AccountLayout />}>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="addresses" element={<AddressesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
      <Toaster />
    </>,
    { route },
  );

const notifications = () => within(screen.getByRole("region", { name: "Notifications" }));

beforeEach(() => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(accountApi, "me").mockResolvedValue(customer);
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("customer");
});

describe("ProfilePage", () => {
  it("saves the name and phone and updates the signed-in user", async () => {
    const user = userEvent.setup();
    const patch = vi.spyOn(accountApi, "updateProfile").mockImplementation(async (input) => ({ ...customer, ...input }) as Customer);
    app("/account/profile");
    const name = await screen.findByLabelText("Full name");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.clear(name);
    await user.type(name, "Sok Dara Chan");
    await user.clear(screen.getByLabelText("Phone", { exact: false }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(patch).toHaveBeenCalledWith({ name: "Sok Dara Chan", phone: null });
    expect(await notifications().findByText("Profile saved")).toBeInTheDocument();
  });

  it("shows the email read-only", async () => {
    app("/account/profile");
    expect(await screen.findByDisplayValue("dara@example.com")).toHaveAttribute("readonly");
  });
});

describe("SecurityPage", () => {
  it("puts a wrong current password on its field", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "changePassword").mockRejectedValue(new ApiError({ kind: "validation", status: 422, message: "Current password is incorrect." }));
    app("/account/security");
    await user.type(await screen.findByLabelText("Current password", { selector: "input" }), "oldpass12");
    await user.type(screen.getByLabelText("New password", { selector: "input" }), "newpass123");
    await user.type(screen.getByLabelText("Confirm new password", { selector: "input" }), "newpass123");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password", { selector: "input" })).toHaveAttribute("aria-invalid", "true");
  });

  it("offers 'Set a password' without the current password for social accounts", async () => {
    const user = userEvent.setup();
    vi.mocked(accountApi.me).mockResolvedValue({ ...customer, has_password: false });
    const change = vi.spyOn(accountApi, "changePassword").mockResolvedValue({ message: "Password changed." });
    app("/account/security");
    expect(await screen.findByRole("heading", { level: 1, name: "Set a password" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password", { selector: "input" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("New password", { selector: "input" }), "newpass123");
    await user.type(screen.getByLabelText("Confirm new password", { selector: "input" }), "newpass123");
    await user.click(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => expect(change).toHaveBeenCalledWith({ password: "newpass123", password_confirmation: "newpass123" }));
  });
});

describe("AddressesPage", () => {
  it("lists addresses with the default marked, and adds a new one prefilled with the customer's details", async () => {
    const user = userEvent.setup();
    const list = vi.spyOn(accountApi, "addresses").mockResolvedValue([home]);
    const create = vi.spyOn(accountApi, "createAddress").mockResolvedValue(work);
    app("/account/addresses");
    expect(await screen.findByRole("article", { name: "Home, default address" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add address" }));
    const dialog = await screen.findByRole("dialog", { name: "New address" });
    expect(within(dialog).getByLabelText("Recipient name")).toHaveValue("Sok Dara");
    expect(within(dialog).getByLabelText("Country")).toHaveValue("Cambodia");
    await user.type(within(dialog).getByLabelText("Street address"), "Building 5");
    await user.type(within(dialog).getByLabelText("City"), "Phnom Penh");
    list.mockResolvedValue([home, work]);
    await user.click(within(dialog).getByRole("button", { name: "Add address" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ recipient_name: "Sok Dara", address_line1: "Building 5", city: "Phnom Penh", country: "Cambodia", address_line2: null, state: null });
    expect(await screen.findByRole("article", { name: "Work" })).toBeInTheDocument();
  });

  it("deletes after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "addresses").mockResolvedValue([home, work]);
    const remove = vi.spyOn(accountApi, "deleteAddress").mockResolvedValue(undefined as never);
    app("/account/addresses");
    await user.click(await screen.findByRole("button", { name: "Delete Work" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Delete this address?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete address" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(12));
  });

  it("stops at the API's limit of 10", async () => {
    vi.spyOn(accountApi, "addresses").mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ ...work, id: 100 + i, label: `Place ${i}` })));
    app("/account/addresses");
    expect(await screen.findByText("You can save up to 10. Delete one to add another.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add address" })).toBeDisabled();
  });
});

describe("account guard", () => {
  it("sends unverified customers to verify their email", () => {
    setSession("customer", { token: "t", expiresAt: null, user: { ...customer, email_verified: false } });
    app("/account/profile");
    expect(screen.getByText("elsewhere")).toBeInTheDocument();
    expect(getSession("customer")).not.toBeNull();
  });
});
