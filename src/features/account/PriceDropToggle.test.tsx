import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "@/api/endpoints/account";
import type { Customer } from "@/api/types";
import { PriceDropToggle } from "./PriceDropToggle";

vi.mock("@/api/endpoints/account", () => ({
  accountApi: { updateProfile: vi.fn() },
  accountKeys: { me: () => ["account", "me"] },
}));

const customer = (overrides: Partial<Customer> = {}) =>
  ({ id: 1, name: "Sokha", email_verified: true, price_drop_alerts: false, ...overrides }) as Customer;

function renderToggle(c: Customer) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PriceDropToggle customer={c} />
    </QueryClientProvider>,
  );
  return client;
}

describe("PriceDropToggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is off by default and turns the emails on through the profile", async () => {
    const user = userEvent.setup();
    vi.mocked(accountApi.updateProfile).mockResolvedValue(customer({ price_drop_alerts: true }));
    const client = renderToggle(customer());

    const toggle = screen.getByRole("switch", { name: "Price-drop emails" });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/5% cheaper or more/);
    expect(screen.getByText("Off: no price-drop emails.")).toBeInTheDocument();

    await user.click(toggle);
    expect(accountApi.updateProfile).toHaveBeenCalledWith({ price_drop_alerts: true });
    await waitFor(() => expect(client.getQueryData<Customer>(["account", "me"])?.price_drop_alerts).toBe(true));
  });

  it("can't be turned on before the email address is confirmed", () => {
    renderToggle(customer({ email_verified: false }));
    expect(screen.getByRole("switch", { name: "Price-drop emails" })).toBeDisabled();
    expect(screen.getByText("Confirm your email address first to get price-drop emails.")).toBeInTheDocument();
  });
});
