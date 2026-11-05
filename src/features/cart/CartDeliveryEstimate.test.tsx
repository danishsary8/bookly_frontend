import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cartApi } from "@/api/endpoints/cart";
import { renderWithProviders } from "@/test/render";
import { CartDeliveryEstimate } from "./CartDeliveryEstimate";

afterEach(() => vi.restoreAllMocks());
it("uses the checkout preview and offers an area choice without a saved address", async () => {
  const preview = vi.spyOn(cartApi, "preview").mockResolvedValue({ has_delivery_address: false, shipping_fee: { usd: "1.50" }, requires_shipping: true, subtotal: { usd: "10.00" }, discount: { usd: "0.00" }, free_shipping_threshold: { usd: "50.00" }, estimated_delivery: { formatted: "6–7 Nov" } });
  const user = userEvent.setup();
  renderWithProviders(<CartDeliveryEstimate version="one" coupon={null} />);
  expect(await screen.findByText(/Estimated delivery fee:.*1.50/)).toBeInTheDocument();
  expect(screen.getByText(/6–7 Nov/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Delivery area"), "provinces");
  await waitFor(() => expect(preview).toHaveBeenLastCalledWith(null, null, "provinces"));
});
