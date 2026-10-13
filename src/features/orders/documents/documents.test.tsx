import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ordersApi } from "@/api/endpoints/orders";
import { opsApi } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { OrderDocument } from "@/api/types";
import InvoicePrintPage from "@/pages/account/InvoicePrintPage";
import OrderDocumentsPrintPage from "@/pages/admin/OrderDocumentsPrintPage";
import { RequireVerified } from "@/routes/guards";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { InvoiceSheet, PackingSlipSheet } from "./OrderSheets";
import { parsePrintIds, staffPrintPath } from "./printLinks";

const doc = (over: Partial<OrderDocument> = {}): OrderDocument => ({
  id: 7,
  order_number: "ORD-7",
  status: "processing",
  placed_at: "2026-10-01T20:30:00Z", // 2 Oct in Phnom Penh
  delivered_at: null,
  payment_method: "cod",
  payment_status: "pending",
  customer: { name: "Sok Dara", email: "dara@example.com", phone: "+85512345678" },
  shipping_address: { recipient_name: "Chan Sophea", phone: "012 345 678", address_line1: "House 12, St 240", city: "Phnom Penh", country: "Cambodia" },
  items: [
    { id: 70, title: "Emma", authors: ["Jane Austen"], format: "paperback", is_digital: false, sku: "EMMA-PB", isbn: "9780141439587", quantity: 2, unit_price_usd: "8.00", subtotal_usd: "16.00" },
    { id: 71, title: "Dracula", authors: ["Bram Stoker"], format: "hardcover", is_digital: false, sku: "DRAC-HC", isbn: null, quantity: 1, unit_price_usd: "12.00", subtotal_usd: "12.00" },
    { id: 72, title: "Emma", authors: ["Jane Austen"], format: "ebook", is_digital: true, sku: "EMMA-EB", isbn: null, quantity: 1, unit_price_usd: "3.00", subtotal_usd: "3.00" },
  ],
  subtotal_usd: "31.00",
  discount_usd: "3.10",
  coupon_code: "WELCOME10",
  shipping_fee_usd: "1.50",
  tax_usd: "0.00",
  total_usd: "29.40",
  refunded_usd: "0.00",
  amount_to_collect_usd: "29.40",
  khr: { rate: "4100.000000", rate_effective_at: "2026-09-30T02:00:00Z", total: "120540", amount_to_collect: "120540" },
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
  clearSession("staff");
  clearSession("customer");
});

describe("print links", () => {
  it("keeps positive whole ids once, in order, at most 50", () => {
    expect(parsePrintIds("3, 1,x,3,-2,1.5,0")).toEqual([3, 1]);
    expect(parsePrintIds(null)).toEqual([]);
    expect(parsePrintIds(Array.from({ length: 60 }, (_, i) => i + 1).join(","))).toHaveLength(50);
    expect(staffPrintPath("packing-slip", [3, 1])).toBe("/admin/print?doc=packing-slip&ids=3,1&autoprint=1");
  });
});

describe("invoice", () => {
  it("lists every line with authors and ISBN, the discount, and what the courier collects in USD and riel", () => {
    render(<InvoiceSheet doc={doc()} />);
    const sheet = screen.getByRole("article", { name: "Invoice ORD-7" });
    expect(within(sheet).getByRole("heading", { name: "Invoice" })).toBeInTheDocument();
    expect(sheet).toHaveTextContent("Ordered 2 Oct 2026");
    expect(sheet).toHaveTextContent("Jane Austen · Paperback · ISBN 9780141439587");
    expect(sheet).toHaveTextContent("Discount (WELCOME10)");
    expect(sheet).toHaveTextContent("−$3.10");
    expect(sheet).toHaveTextContent("Total (USD)$29.40");
    expect(sheet).toHaveTextContent(/Collect on delivery: \$29\.40 \(120,540\s៛\)/);
    expect(sheet).toHaveTextContent(/at 1 USD = 4,100\s៛ \(rate of 30 Sept 2026\)/);
    expect(within(sheet).getAllByRole("row")).toHaveLength(4); // header + 3 lines (digital included)
  });

  it("stamps a paid order and shows refunds; no riel line without a rate", () => {
    render(<InvoiceSheet doc={doc({ status: "delivered", payment_status: "succeeded", delivered_at: "2026-10-05T03:00:00Z", amount_to_collect_usd: "0.00", refunded_usd: "8.00", khr: null })} />);
    const sheet = screen.getByRole("article", { name: "Receipt ORD-7" });
    expect(within(sheet).getByRole("heading", { name: "Receipt" })).toBeInTheDocument();
    expect(sheet).toHaveTextContent("Paid on delivery, 5 Oct 2026");
    expect(within(sheet).getByText("Paid")).toBeInTheDocument();
    expect(sheet).toHaveTextContent("Refunded−$8.00");
    expect(sheet).not.toHaveTextContent("Collect on delivery");
    expect(sheet).not.toHaveTextContent("៛");
  });

  it("stamps a returned order and asks for nothing", () => {
    render(<InvoiceSheet doc={doc({ status: "returned", payment_status: "refunded", amount_to_collect_usd: "0.00", refunded_usd: "29.40" })} />);
    const sheet = screen.getByRole("article");
    expect(within(sheet).getByText("Returned · refunded")).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "Invoice" })).toBeInTheDocument(); // the stamp says what happened
    expect(sheet).toHaveTextContent("Refunded−$29.40");
    expect(sheet).not.toHaveTextContent("Collect on delivery");
  });

  it("stamps a cancelled order", () => {
    render(<InvoiceSheet doc={doc({ status: "cancelled", amount_to_collect_usd: "0.00" })} />);
    expect(within(screen.getByRole("article")).getByText("Cancelled")).toBeInTheDocument();
  });
});

describe("packing slip", () => {
  it("lists only the books to pack, with SKU, without prices, and the amount to collect", () => {
    render(<PackingSlipSheet doc={doc()} />);
    const sheet = screen.getByRole("article", { name: "Packing slip ORD-7" });
    const rows = within(sheet).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 printed books
    expect(rows[1]).toHaveTextContent("2EmmaJane AustenPaperbackEMMA-PB9780141439587");
    expect(rows[2]).toHaveTextContent("DRAC-HC");
    expect(within(sheet).getByRole("table")).not.toHaveTextContent("$");
    expect(sheet).toHaveTextContent("3 books in the box");
    expect(sheet).toHaveTextContent("Not packed (digital): Emma (Ebook)");
    expect(sheet).toHaveTextContent("Chan Sophea012 345 678");
    expect(sheet).toHaveTextContent(/Collect on delivery: \$29\.40/);
  });

  it("says when there is nothing to pack or collect", () => {
    render(<PackingSlipSheet doc={doc({ items: [doc().items![2]], payment_status: "succeeded", amount_to_collect_usd: "0.00" })} />);
    const sheet = screen.getByRole("article");
    expect(sheet).toHaveTextContent("Nothing to pack: this order has digital books only.");
    expect(sheet).toHaveTextContent("Paid: collect nothing");
  });
});

describe("print pages", () => {
  it("staff: prints the slips for the ids in the link, in that order, and counts any not found", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: { id: 2, name: "Demo Staff", email: "staff@bookly.test", role: "staff", two_factor_enabled: true } });
    const load = vi.spyOn(opsApi, "orderDocuments").mockResolvedValue([doc({ id: 9, order_number: "ORD-9" }), doc()]);
    renderWithProviders(
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/print" element={<OrderDocumentsPrintPage />} />
        </Route>
      </Routes>,
      { route: "/admin/print?doc=packing-slip&ids=9,7,404" },
    );
    const sheets = await screen.findAllByRole("article");
    expect(load).toHaveBeenCalledWith([9, 7, 404]);
    expect(sheets.map((s) => s.getAttribute("aria-label"))).toEqual(["Packing slip ORD-9", "Packing slip ORD-7"]);
    expect(screen.getByText(/2 packing slips · 1 not found/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "All orders" })).toHaveAttribute("href", "/admin/orders");
  });

  it("customer: shows their invoice, or why there is none", async () => {
    setSession("customer", { token: "t", expiresAt: null, user: { id: 4, name: "Sok Dara", email: "dara@example.com", phone: null, email_verified: true, has_password: true } });
    vi.spyOn(ordersApi, "invoice").mockResolvedValueOnce(doc());
    const page = (route: string) =>
      renderWithProviders(
        <Routes>
          <Route element={<RequireVerified />}>
            <Route path="/account/orders/:id/invoice" element={<InvoicePrintPage />} />
          </Route>
        </Routes>,
        { route },
      );
    const first = page("/account/orders/7/invoice");
    expect(await screen.findByRole("article", { name: "Invoice ORD-7" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the order" })).toHaveAttribute("href", "/account/orders/7");
    first.unmount();

    vi.spyOn(ordersApi, "invoice").mockRejectedValueOnce(new ApiError({ kind: "validation", status: 422, message: "A cancelled order has no invoice.", fieldErrors: {} }));
    page("/account/orders/8/invoice");
    expect(await screen.findByText("A cancelled order has no invoice.")).toBeInTheDocument();
  });
});
