import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { cartApi } from "@/api/endpoints/cart";
import { deliveryApi } from "@/api/endpoints/delivery";
import { ordersApi } from "@/api/endpoints/orders";
import { paymentsApi, type KhqrPayment } from "@/api/endpoints/payments";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { Address, Cart, Customer, DeliveryOptionsData, Order } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { setLanguage } from "@/i18n";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import CheckoutPage from "@/pages/checkout/CheckoutPage";
import KhqrPayPage from "./KhqrPayPage";
import OrderDetailPage from "./OrderDetailPage";

/* KHQR payments (owner 2026-11-02: real KHQR + test mode, 15 minutes, USD or KHR). */

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true };
const home: Address = { id: 11, label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12", address_line2: null, city: "Phnom Penh", state: null, postal_code: null, country: "Cambodia", is_default: true };
const cart: Cart = {
  id: 1,
  items: [{ id: 5, book_variant_id: 3, book: { id: 1, title: "The Mekong Letters" }, format: "paperback", quantity: 2, unit_price_usd: "12.50", unit_price_khr: "51250", line_total_usd: "25.00", line_total_khr: "102500", issues: [] }],
  item_count: 2, subtotal_usd: "25.00", subtotal_khr: "102500", can_checkout: true,
};
const amount = (usd: string) => ({ usd, khr: String(Math.round(Number(usd) * 4100)) });
const order: Order = {
  id: 42, order_number: "ORD-20261102-ABCDE", status: "pending", payment_method: "khqr", payment_status: "pending", payment_due_at: "2026-11-02T10:15:00Z",
  items: [{ id: 1, book_id: 1, title: "The Mekong Letters", format: "paperback", quantity: 2, unit_price_usd: "12.50", subtotal_usd: "25.00" }],
  subtotal_usd: "25.00", discount_usd: "0.00", shipping_fee_usd: "1.50", tax_usd: "0.00", total_usd: "26.50", total_khr: "108650", can_cancel: true,
  shipping_address: { label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12", city: "Phnom Penh", country: "Cambodia" },
};
const QR_USD = "00020101021229150011bookly@devb520459995303840540526.505802KH5906Bookly6010Phnom Penh6304ABCD";
const waiting: KhqrPayment = {
  order_id: 42, order_number: "ORD-20261102-ABCDE", status: "awaiting_payment", mode: "test", expires_at: "2026-11-02T10:15:00Z", seconds_left: 900, total_usd: "26.50", paid: null,
  qrs: [{ currency: "USD", amount: "26.50", qr: QR_USD, md5: "a".repeat(32) }],
};
const options = (khqr: boolean) =>
  ({ free_shipping: { threshold_usd: null, threshold_khr: null, is_active: false }, provinces: [], payment_methods: [{ code: "cod" }, ...(khqr ? [{ code: "khqr", mode: "test", pay_minutes: 15 }] : [])] }) as unknown as DeliveryOptionsData;

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}
const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success/:id" element={<p>Success page</p>} />
        <Route path="/account/orders/:id" element={<OrderDetailPage />} />
        <Route path="/account/orders/:id/pay" element={<KhqrPayPage />} />
      </Routes>
      <Where />
      <Toaster />
    </>,
    { route },
  );

beforeEach(() => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
  vi.spyOn(cartApi, "preview").mockResolvedValue({
    subtotal: amount("25.00"), discount: amount("0.00"), shipping_fee: amount("1.50"), tax: amount("0.00"), total: amount("26.50"),
    coupon_code: null, requires_shipping: true, delivery_area: "phnom_penh", can_checkout: true,
  } as never);
  vi.spyOn(accountApi, "addresses").mockResolvedValue([home]);
  vi.spyOn(ordersApi, "order").mockResolvedValue(order);
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("customer");
  setLanguage("en");
});

describe("checkout payment choice", () => {
  it("keeps KHQR as coming soon when the API does not offer it", async () => {
    vi.spyOn(deliveryApi, "options").mockResolvedValue(options(false));
    app("/checkout");
    const khqr = await screen.findByRole("radio", { name: /Bakong KHQR/ });
    expect(khqr).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Cash on delivery/ })).toBeChecked();
  });

  it("places a KHQR order and opens its payment page", async () => {
    const user = userEvent.setup();
    vi.spyOn(deliveryApi, "options").mockResolvedValue(options(true));
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue(waiting);
    const place = vi.spyOn(cartApi, "placeOrder").mockResolvedValue(order);
    app("/checkout");
    const khqr = await screen.findByRole("radio", { name: /Bakong KHQR.*15 minutes.*Test mode/ });
    await waitFor(() => expect(khqr).toBeEnabled());
    await user.click(khqr);
    await user.click(screen.getByRole("button", { name: "Place order and pay" }));
    await waitFor(() => expect(place).toHaveBeenCalled());
    expect(place.mock.calls[0][0]).toMatchObject({ payment_method: "khqr", address_id: 11 });
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/account/orders/42/pay"));
  });
});

describe("KHQR payment page", () => {
  it("shows the QR, the amount, the time left and the test banner", async () => {
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue(waiting);
    app("/account/orders/42/pay");
    expect(await screen.findByRole("img", { name: "KHQR code to pay $26.50 for order ORD-20261102-ABCDE" })).toBeInTheDocument();
    expect(screen.getByText("$26.50")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent(/1[45]:\d\d/);
    expect(screen.getByText(/Test mode: this is a real KHQR/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "US dollars" })).toHaveAttribute("aria-selected", "true");
  });

  it("asks for the riel QR when the KHR tab is chosen", async () => {
    const user = userEvent.setup();
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue(waiting);
    const riel = vi.spyOn(paymentsApi, "khqrQr").mockResolvedValue({ ...waiting, qrs: [...waiting.qrs!, { currency: "KHR", amount: "108650", qr: QR_USD.replace("840", "116"), md5: "b".repeat(32) }] });
    app("/account/orders/42/pay");
    await user.click(await screen.findByRole("tab", { name: "Riel" }));
    expect(riel).toHaveBeenCalledWith(42, "KHR");
    expect(await screen.findByText("108,650 ៛")).toBeInTheDocument();
  });

  it("simulate (test mode) shows the paid screen, then opens the order", async () => {
    const user = userEvent.setup();
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue(waiting);
    vi.spyOn(paymentsApi, "simulate").mockResolvedValue({ ...waiting, status: "paid", qrs: [], seconds_left: 0, paid: { currency: "USD", amount: "26.50", paid_at: "2026-11-02T10:01:00Z" } });
    app("/account/orders/42/pay");
    await user.click(await screen.findByRole("button", { name: /Simulate payment/ }));
    expect(await screen.findByText("Payment received")).toBeInTheDocument();
    expect(screen.getByText(/We received \$26\.50/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/account\/orders\/42$/), { timeout: 5000 });
  });

  it("no Simulate button in bakong mode", async () => {
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue({ ...waiting, mode: "bakong" });
    app("/account/orders/42/pay");
    await screen.findByRole("img", { name: /KHQR code/ });
    expect(screen.queryByRole("button", { name: /Simulate payment/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Test mode/)).not.toBeInTheDocument();
  });

  it("time over: says the order was cancelled and offers Buy again", async () => {
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue({ ...waiting, status: "expired", seconds_left: 0, qrs: [] });
    vi.spyOn(ordersApi, "order").mockResolvedValue({ ...order, status: "cancelled", payment_due_at: null });
    app("/account/orders/42/pay");
    expect(await screen.findByText("The time to pay is over")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Buy again" })).toBeInTheDocument();
  });

  it("not a KHQR order (404): says there is nothing to pay", async () => {
    vi.spyOn(paymentsApi, "khqr").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app("/account/orders/42/pay");
    expect(await screen.findByRole("heading", { level: 1, name: "No payment to show" })).toBeInTheDocument();
  });

  it("Khmer texts", async () => {
    setLanguage("km");
    vi.spyOn(paymentsApi, "khqr").mockResolvedValue(waiting);
    app("/account/orders/42/pay");
    expect(await screen.findByRole("heading", { level: 1, name: "បង់ប្រាក់តាម KHQR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /សាកល្បងបង់ប្រាក់/ })).toBeInTheDocument();
  });
});

describe("Pay now on the order page", () => {
  it("shows Pay now while the KHQR order waits for payment", async () => {
    vi.spyOn(ordersApi, "returnable").mockResolvedValue({ can_request_return: false, items: [] } as never);
    app("/account/orders/42");
    const pay = await screen.findByRole("link", { name: "Pay now" });
    expect(pay).toHaveAttribute("href", "/account/orders/42/pay");
    expect(within(pay.parentElement!).queryByRole("button", { name: "Buy again" })).not.toBeInTheDocument();
  });
});
