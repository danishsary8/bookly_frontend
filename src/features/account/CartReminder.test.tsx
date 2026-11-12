import { ApiError } from "@/api/errors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "@/api/endpoints/account";
import type { Customer } from "@/api/types";
import CartReminderStopPage from "@/pages/CartReminderStopPage";
import { CartReminderToggle } from "./CartReminderToggle";

vi.mock("@/api/endpoints/account", () => ({
  accountApi: { updateProfile: vi.fn(), stopCartReminders: vi.fn() },
  accountKeys: { me: () => ["account", "me"] },
}));

const customer = (overrides: Partial<Customer> = {}) =>
  ({ id: 1, name: "Sokha", email_verified: true, cart_reminders: true, ...overrides }) as Customer;

function withClient(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}

describe("Cart reminder emails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is on by default and can be turned off in the profile", async () => {
    const user = userEvent.setup();
    vi.mocked(accountApi.updateProfile).mockResolvedValue(customer({ cart_reminders: false }));
    const client = withClient(<CartReminderToggle customer={customer()} />);

    const toggle = screen.getByRole("switch", { name: "Cart reminder emails" });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/At most one email a week/);

    await user.click(toggle);
    expect(accountApi.updateProfile).toHaveBeenCalledWith({ cart_reminders: false });
    await waitFor(() => expect(client.getQueryData<Customer>(["account", "me"])?.cart_reminders).toBe(false));
  });

  it("needs a confirmed email", () => {
    withClient(<CartReminderToggle customer={customer({ email_verified: false })} />);
    expect(screen.getByRole("switch", { name: "Cart reminder emails" })).toBeDisabled();
  });

  const openStopLink = (search: string) =>
    withClient(
      <MemoryRouter initialEntries={[`/email/cart-reminders/stop${search}`]}>
        <Routes>
          <Route path="/email/cart-reminders/stop" element={<CartReminderStopPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it("the email's stop link turns them off without signing in", async () => {
    vi.mocked(accountApi.stopCartReminders).mockResolvedValue({ message: "ok" });
    openStopLink("?customer=7&token=abc123");

    expect(await screen.findByText("Done. You won't get cart reminder emails any more.")).toBeInTheDocument();
    expect(accountApi.stopCartReminders).toHaveBeenCalledTimes(1);
    expect(accountApi.stopCartReminders).toHaveBeenCalledWith(7, "abc123");
    expect(screen.getByRole("link", { name: "View your cart" })).toHaveAttribute("href", "/cart");
  });

  it("says so when the link is broken", async () => {
    vi.mocked(accountApi.stopCartReminders).mockRejectedValue(new ApiError({ kind: "validation", status: 422, message: "Invalid link." }));
    openStopLink("?customer=7&token=wrong");
    expect(await screen.findByText(/You can turn cart reminders off in Account/)).toBeInTheDocument();

    vi.clearAllMocks();
    openStopLink("?token=abc");
    expect(screen.getAllByText(/This link doesn't work/).length).toBeGreaterThan(0);
    expect(accountApi.stopCartReminders).not.toHaveBeenCalled();
  });
});
