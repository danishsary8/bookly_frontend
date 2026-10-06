import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { cartApi } from "@/api/endpoints/cart";
import { ordersApi } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { Address, Cart, CheckoutPreview, Customer, Order } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { getCoupon, setCoupon } from "@/features/cart/couponStore";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import CartPage from "@/pages/cart/CartPage";
import CheckoutPage from "./CheckoutPage";
import OrderConfirmationPage from "./OrderConfirmationPage";

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true };
const home: Address = { id: 11, label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", address_line2: null, city: "Phnom Penh", state: null, postal_code: null, country: "Cambodia", is_default: true };
const work: Address = { ...home, id: 12, label: "Work", city: "Siem Reap", is_default: false };
const cart: Cart = {
  id: 1,
  items: [{ id: 5, book_variant_id: 3, book: { id: 1, title: "The Mekong Letters" }, format: "paperback", quantity: 2, unit_price_usd: "12.99", unit_price_khr: "53259", line_total_usd: "25.98", line_total_khr: "106518", issues: [] }],
  item_count: 2,
  subtotal_usd: "25.98",
  subtotal_khr: "106518",
  can_checkout: true,
};
const amount = (usd: string) => ({ usd, khr: String(Math.round(Number(usd) * 4100)) });
// The default address (Home) is in Phnom Penh; Work is in Siem Reap, which costs the provinces fee.
const preview = (coupon: string | null, addressId: number | null = null): CheckoutPreview => {
  const provinces = addressId === work.id;
  const shipping = provinces ? 3 : 1.5;
  const discount = coupon ? 2.59 : 0;
  return {
    subtotal: amount("25.98"),
    discount: amount(discount.toFixed(2)),
    shipping_fee: amount(shipping.toFixed(2)),
    tax: amount("0.00"),
    total: amount((25.98 - discount + shipping).toFixed(2)),
    coupon_code: coupon,
    requires_shipping: true,
    delivery_area: provinces ? "provinces" : "phnom_penh",
    can_checkout: true,
  };
};
const order: Order = {
  id: 42,
  order_number: "BK-000042",
  status: "pending",
  payment_method: "cod",
  items: [{ id: 1, book_id: 1, title: "The Mekong Letters", format: "paperback", quantity: 2, unit_price_usd: "12.99", subtotal_usd: "25.98" }],
  subtotal_usd: "25.98",
  discount_usd: "2.59",
  shipping_fee_usd: "2.00",
  tax_usd: "0.00",
  total_usd: "25.39",
  total_khr: "104099",
  coupon_code: "WELCOME10",
  shipping_address: { label: "Home", recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", city: "Phnom Penh", country: "Cambodia" },
};

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success/:id" element={<OrderConfirmationPage />} />
      </Routes>
      <Toaster />
    </>,
    { route },
  );

beforeEach(() => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
  vi.spyOn(cartApi, "preview").mockImplementation(async (code, addressId) => preview(code ?? null, addressId ?? null));
  vi.spyOn(accountApi, "addresses").mockResolvedValue([work, home]);
  vi.spyOn(accountApi, "wishlist").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0 } } as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  setCoupon(null);
  clearSession("customer");
});

describe("CartPage", () => {
  it("applies a coupon and shows the discount", async () => {
    const user = userEvent.setup();
    vi.spyOn(cartApi, "checkCoupon").mockResolvedValue({ code: "WELCOME10", type: "percentage", value: "10.00", subtotal_usd: "25.98", discount_usd: "2.59", discount_khr: "10619" });
    app("/cart");
    await user.type(await screen.findByLabelText("Coupon code"), "welcome10");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect((await screen.findAllByText(/−\$2\.59/)).length).toBeGreaterThan(0);
    expect(getCoupon()).toBe("WELCOME10");
  });

  it("shows why a coupon doesn't apply", async () => {
    const user = userEvent.setup();
    vi.spyOn(cartApi, "checkCoupon").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "Invalid", fieldErrors: { code: ["Order subtotal must be at least 30.00."] } }),
    );
    app("/cart");
    await user.type(await screen.findByLabelText("Coupon code"), "SAVE5");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("Order subtotal must be at least 30.00.")).toBeInTheDocument();
    expect(getCoupon()).toBeNull();
  });

  it("stops checkout while a line is out of stock", async () => {
    vi.mocked(cartApi.cart).mockResolvedValue({ ...cart, can_checkout: false, items: [{ ...cart.items![0], issues: [{ code: "out_of_stock", message: "This format is out of stock." }] }] });
    app("/cart");
    expect(await screen.findByText("This format is out of stock.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue to checkout" })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("CheckoutPage", () => {
  it("preselects the default address and places a cash-on-delivery order", async () => {
    const user = userEvent.setup();
    setCoupon("WELCOME10");
    const place = vi.spyOn(cartApi, "placeOrder").mockResolvedValue(order);
    vi.spyOn(ordersApi, "order").mockResolvedValue(order);
    app("/checkout");
    const summary = await screen.findByRole("complementary", { name: "Order total" });
    expect(await within(summary).findByText("−$2.59")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Home/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Cash on delivery/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Card/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(place).toHaveBeenCalledWith({ address_id: 11, payment_method: "cod", coupon_code: "WELCOME10" }, expect.any(String));
    expect(await screen.findByRole("heading", { level: 1, name: /Thank you/ })).toBeInTheDocument();
    expect(screen.getByText(/BK-000042/)).toBeInTheDocument();
    expect(getCoupon()).toBeNull();
  });

  it("prices delivery for the chosen address", async () => {
    const user = userEvent.setup();
    app("/checkout");
    const summary = await screen.findByRole("complementary", { name: "Order total" });
    expect(await within(summary).findByText("Delivery (Phnom Penh)")).toBeInTheDocument();
    expect(within(summary).getByText("$1.50")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Work/ }));
    expect(await within(summary).findByText("Delivery (provinces)")).toBeInTheDocument();
    expect(within(summary).getByText("$3.00")).toBeInTheDocument();
    expect(cartApi.preview).toHaveBeenLastCalledWith(null, work.id);
  });

  it("retries with the same key after a lost response, and a new key after a refusal", async () => {
    const user = userEvent.setup();
    const place = vi
      .spyOn(cartApi, "placeOrder")
      .mockRejectedValueOnce(new ApiError({ kind: "validation", status: 422, message: "Invalid", fieldErrors: { cart: ["Only 1 left in stock."] } }))
      .mockRejectedValueOnce(new ApiError({ kind: "network", message: "Network error" }))
      .mockResolvedValueOnce(order);
    vi.spyOn(ordersApi, "order").mockResolvedValue(order);
    app("/checkout");
    const button = await screen.findByRole("button", { name: "Place order" });
    await waitFor(() => expect(button).toBeEnabled());

    await user.click(button);
    expect(await screen.findByText("Only 1 left in stock.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled());

    // The order went through but the response was lost; the cart is empty on the server now.
    vi.mocked(cartApi.cart).mockResolvedValue({ ...cart, items: [], item_count: 0, can_checkout: false });
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByText("We couldn't confirm your order")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByRole("heading", { level: 1, name: /Thank you/ })).toBeInTheDocument();
    const [first, second, third] = place.mock.calls.map((call) => call[1]);
    expect(second).not.toBe(first);
    expect(third).toBe(second);
  });

  it("sends an empty cart back to the cart page", async () => {
    vi.mocked(cartApi.cart).mockResolvedValue({ ...cart, items: [], item_count: 0 });
    app("/checkout");
    expect(await screen.findByRole("heading", { level: 1, name: /cart/i })).toBeInTheDocument();
  });
});

describe("OrderConfirmationPage", () => {
  it("loads the order on a fresh visit", async () => {
    vi.spyOn(ordersApi, "order").mockResolvedValue(order);
    app("/checkout/success/42");
    expect(await screen.findByRole("heading", { level: 1, name: /Thank you/ })).toBeInTheDocument();
    expect(screen.getByText(/House 12, St 240/)).toBeInTheDocument();
    expect(ordersApi.order).toHaveBeenCalledWith(42);
  });
});
