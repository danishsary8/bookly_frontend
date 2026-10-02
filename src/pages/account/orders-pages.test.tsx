import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { ordersApi } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { Customer, Order, OwnReview, Paginated, ReturnableItems, ReturnRequest } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { YourReview } from "@/features/reviews/YourReview";
import LegacyOrderRedirect from "@/routes/LegacyOrderRedirect";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import OrderDetailPage from "./OrderDetailPage";
import OrdersPage from "./OrdersPage";
import ReturnDetailPage from "./ReturnDetailPage";
import ReturnRequestPage from "./ReturnRequestPage";
import ReviewsPage from "./ReviewsPage";

const customer: Customer = { id: 1, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true };
const address = { recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", city: "Phnom Penh", country: "Cambodia" };
const pending: Order = {
  id: 7,
  order_number: "ORD-7",
  status: "pending",
  payment_method: "cod",
  payment_status: "pending",
  placed_at: "2026-10-01T08:00:00Z",
  item_count: 1,
  items: [{ id: 70, book_id: 3, title: "Emma", format: "paperback", quantity: 1, unit_price_usd: "9.99", subtotal_usd: "9.99" }],
  subtotal_usd: "9.99",
  discount_usd: "0.00",
  shipping_fee_usd: "2.00",
  tax_usd: "0.00",
  total_usd: "11.99",
  total_khr: "49159",
  shipping_address: address,
  can_cancel: true,
  status_history: [{ status: "pending", note: "Order placed.", created_at: "2026-10-01T08:00:00Z" }],
};
const delivered: Order = {
  ...pending,
  id: 8,
  order_number: "ORD-8",
  status: "delivered",
  payment_status: "succeeded",
  item_count: 2,
  items: [
    { id: 80, book_id: 6, title: "The Hound of the Baskervilles", format: "hardcover", quantity: 2, unit_price_usd: "18.99", subtotal_usd: "37.98" },
    { id: 81, book_id: 9, title: "Meditations", format: "ebook", quantity: 1, unit_price_usd: "4.99", subtotal_usd: "4.99" },
  ],
  can_cancel: false,
  status_history: [
    { status: "pending", note: "Order placed.", created_at: "2026-09-24T04:15:00Z" },
    { status: "delivered", note: null, created_at: "2026-09-25T20:15:00Z" },
  ],
};
const returnable: ReturnableItems = {
  order_id: 8,
  returnable_until: "2026-10-09T20:15:00Z",
  can_request_return: true,
  reason_unavailable: null,
  items: [{ order_item_id: 80, title: "The Hound of the Baskervilles", format: "hardcover", purchased_quantity: 2, returnable_quantity: 2 }],
};
const returnRequest: ReturnRequest = {
  id: 2,
  order_id: 8,
  order_number: "ORD-8",
  status: "requested",
  reason: "Damaged in transit.",
  items: [{ id: 1, order_item_id: 80, title: "The Hound of the Baskervilles", format: "hardcover", quantity: 1, unit_price_usd: "18.99", reason: null }],
  refund_amount_usd: "18.99",
  is_refund_final: false,
  requested_at: "2026-10-02T10:00:00Z",
  can_withdraw: true,
};
const page = <T,>(data: T[]): Paginated<T> => ({ data, meta: { current_page: 1, last_page: 1, per_page: 10, total: data.length, from: 1, to: data.length } }) as Paginated<T>;
const ownReview: OwnReview = { id: 5, book_id: 6, book: { id: 6, title: "The Hound of the Baskervilles" }, rating: 4, comment: "Gripping.", is_visible: true, created_at: "2026-10-02T10:00:00Z" };

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/account/orders" element={<OrdersPage />} />
        <Route path="/account/orders/:id" element={<OrderDetailPage />} />
        <Route path="/account/orders/:id/return" element={<ReturnRequestPage />} />
        <Route path="/account/returns" element={<p>returns list</p>} />
        <Route path="/account/returns/:id" element={<ReturnDetailPage />} />
        <Route path="/account/reviews" element={<ReviewsPage />} />
        <Route path="/orders/:id" element={<LegacyOrderRedirect />} />
        <Route path="/books/:id" element={<YourReview bookId={6} />} />
        <Route path="/login" element={<p>sign in</p>} />
      </Routes>
      <Where />
      <Toaster />
    </>,
    { route },
  );

beforeEach(() => {
  setSession("customer", { token: "t", expiresAt: null, user: customer });
  vi.spyOn(ordersApi, "orders").mockImplementation(async (params = {}) => page([pending, delivered].filter((o) => !params.status || o.status === params.status)));
  vi.spyOn(ordersApi, "order").mockImplementation(async (id) => ({ ...[pending, delivered].find((o) => o.id === id)! }));
  vi.spyOn(ordersApi, "returnable").mockResolvedValue(returnable);
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("customer");
});

describe("OrdersPage", () => {
  it("lists orders and filters by status through the URL", async () => {
    const user = userEvent.setup();
    app("/account/orders");
    const list = await screen.findByRole("list", { name: "Your orders" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByRole("link", { name: /ORD-7/ })).toHaveAttribute("href", "/account/orders/7");
    await user.selectOptions(screen.getByLabelText("Show"), "delivered");
    expect(screen.getByTestId("where")).toHaveTextContent("/account/orders?status=delivered");
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Your orders" })).getAllByRole("listitem")).toHaveLength(1));
    expect(ordersApi.orders).toHaveBeenLastCalledWith(expect.objectContaining({ status: "delivered" }));
  });
});

describe("OrderDetailPage", () => {
  it("cancels a pending order with a reason", async () => {
    const user = userEvent.setup();
    const cancelled: Order = { ...pending, status: "cancelled", can_cancel: false };
    const cancel = vi.spyOn(ordersApi, "cancel").mockImplementation(async () => {
      vi.mocked(ordersApi.order).mockResolvedValue(cancelled);
      return cancelled;
    });
    app("/account/orders/7");
    expect(await screen.findByRole("heading", { level: 1, name: "Order ORD-7" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Timeline" })).toHaveTextContent("Order placed.");
    expect(screen.queryByRole("link", { name: "Review this book" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Reason/), "Wrong edition");
    await user.click(within(dialog).getByRole("button", { name: "Cancel order" }));
    expect(cancel).toHaveBeenCalledWith(7, "Wrong edition");
    expect(await screen.findByText("Order ORD-7 cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
  });

  it("offers a return and reviews once delivered", async () => {
    app("/account/orders/8");
    expect(await screen.findByRole("link", { name: /Request a return/ })).toHaveAttribute("href", "/account/orders/8/return");
    expect(screen.getAllByRole("link", { name: "Review this book" })[0]).toHaveAttribute("href", "/books/6#your-review");
    expect(screen.getByText("Total paid")).toBeInTheDocument();
  });

  it("explains why a delivered order can't be returned", async () => {
    vi.mocked(ordersApi.returnable).mockResolvedValue({ ...returnable, can_request_return: false, reason_unavailable: "The return window for this order has closed." });
    app("/account/orders/8");
    expect(await screen.findByText("The return window for this order has closed.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Request a return/ })).not.toBeInTheDocument();
  });

  it("is reachable from the old /orders/:id links", async () => {
    app("/orders/7");
    expect(await screen.findByRole("heading", { level: 1, name: "Order ORD-7" })).toBeInTheDocument();
  });
});

describe("ReturnRequestPage", () => {
  it("asks for a book and a reason, then sends the chosen lines", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(ordersApi, "requestReturn").mockResolvedValue(returnRequest);
    vi.spyOn(ordersApi, "return").mockResolvedValue(returnRequest);
    app("/account/orders/8/return");
    await user.click(await screen.findByRole("button", { name: /Request return/ }));
    expect(screen.getByText("Choose at least one book to return.")).toBeInTheDocument();
    expect(screen.getByText("Tell us why you're returning these books.")).toBeInTheDocument();
    expect(screen.queryByText("Meditations")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /The Hound of the Baskervilles/ }));
    await user.selectOptions(screen.getByLabelText("Quantity"), "2");
    await user.type(screen.getByLabelText(/What's wrong with it/), "Creased cover");
    await user.type(screen.getByLabelText(/Why are you returning/), "Damaged in transit.");
    await user.click(screen.getByRole("button", { name: /Request return/ }));
    expect(request).toHaveBeenCalledWith(8, "Damaged in transit.", [{ order_item_id: 80, quantity: 2, reason: "Creased cover" }]);
    expect(await screen.findByRole("heading", { level: 1, name: "Return #2" })).toBeInTheDocument();
  });

  it("shows the API's reason when the return is refused", async () => {
    const user = userEvent.setup();
    vi.spyOn(ordersApi, "requestReturn").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "Invalid", fieldErrors: { order: ["This order already has a return request in progress."] } }),
    );
    app("/account/orders/8/return");
    await user.click(await screen.findByRole("checkbox", { name: /The Hound/ }));
    await user.type(screen.getByLabelText(/Why are you returning/), "Damaged.");
    await user.click(screen.getByRole("button", { name: /Request return/ }));
    expect(await screen.findByText("This order already has a return request in progress.")).toBeInTheDocument();
  });
});

describe("ReturnDetailPage", () => {
  it("withdraws a requested return", async () => {
    const user = userEvent.setup();
    vi.spyOn(ordersApi, "return").mockResolvedValue(returnRequest);
    const withdraw = vi.spyOn(ordersApi, "withdrawReturn").mockResolvedValue(undefined as never);
    app("/account/returns/2");
    expect(await screen.findByText("Estimated refund")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Withdraw return/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Withdraw return" }));
    expect(withdraw).toHaveBeenCalledWith(2);
    expect(await screen.findByText("returns list")).toBeInTheDocument();
  });
});

describe("reviews", () => {
  it("lets a customer who received the book post a review", async () => {
    const user = userEvent.setup();
    vi.spyOn(ordersApi, "myReviews").mockResolvedValue(page<OwnReview>([]));
    const create = vi.spyOn(ordersApi, "createReview").mockResolvedValue(ownReview);
    app("/books/6");
    await user.click(await screen.findByRole("button", { name: /Write a review/ }));
    await user.click(screen.getByRole("button", { name: "Post review" }));
    expect(screen.getByText("Choose a rating from 1 to 5 stars.")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /^4 stars/ }));
    expect(screen.queryByText("Choose a rating from 1 to 5 stars.")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Your review/), "Gripping.");
    await user.click(screen.getByRole("button", { name: "Post review" }));
    expect(create).toHaveBeenCalledWith(6, { rating: 4, comment: "Gripping." });
    expect(await screen.findByText("Thanks for your review")).toBeInTheDocument();
  });

  it("shows the existing review with edit, and says when the book can't be reviewed yet", async () => {
    vi.spyOn(ordersApi, "myReviews").mockResolvedValue(page([ownReview]));
    const { unmount } = app("/books/6");
    expect(await screen.findByText("Gripping.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    unmount();

    vi.mocked(ordersApi.myReviews).mockResolvedValue(page<OwnReview>([]));
    vi.mocked(ordersApi.orders).mockResolvedValue(page<Order>([]));
    app("/books/6");
    expect(await screen.findByText(/once an order with it has been delivered/)).toBeInTheDocument();
  });

  it("asks a signed-out visitor to sign in and come back", async () => {
    clearSession("customer");
    app("/books/6");
    expect(screen.getByRole("link", { name: "Sign in to review it" })).toHaveAttribute("href", "/login?next=%2Fbooks%2F6%23your-review");
  });

  it("deletes a review from the account list", async () => {
    const user = userEvent.setup();
    vi.spyOn(ordersApi, "myReviews").mockResolvedValue(page([ownReview]));
    const remove = vi.spyOn(ordersApi, "deleteReview").mockResolvedValue(undefined as never);
    app("/account/reviews");
    const list = await screen.findByRole("list", { name: "Your reviews" });
    expect(within(list).getByRole("link", { name: /Edit/ })).toHaveAttribute("href", "/books/6#your-review");
    await user.click(within(list).getByRole("button", { name: /Delete/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete review" }));
    expect(remove).toHaveBeenCalledWith(5);
    expect(await screen.findByText("Review deleted")).toBeInTheDocument();
  });
});
