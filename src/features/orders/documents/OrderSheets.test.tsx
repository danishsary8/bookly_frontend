import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { opsApi, type StaffOrder } from "@/api/endpoints/staffOps";
import { clearSession, setSession } from "@/api/session";
import type { OrderDocument, Paginated } from "@/api/types";
import OrderDocumentsPrintPage from "@/pages/admin/OrderDocumentsPrintPage";
import DailySalesPrintPage from "@/pages/admin/DailySalesPrintPage";
import { renderWithProviders } from "@/test/render";
import { DeliveryManifestSheet, InvoiceSheet } from "./OrderSheets";

const baseDoc: OrderDocument = {
  id: 1,
  order_number: "ORD-2026-0001",
  status: "pending",
  placed_at: "2026-10-15T10:00:00Z",
  delivered_at: null,
  delivery_note: null,
  payment_method: "cod",
  payment_status: "pending",
  customer: { name: "Sophea", email: "sophea@example.com", phone: "+85512345678" },
  shipping_address: {
    recipient_name: "Sophea",
    phone: "+85512345678",
    address_line1: "St. 2004",
    address_line2: undefined,
    city: "Phnom Penh",
    state: undefined,
    postal_code: "12000",
    country: "Cambodia",
  },
  items: [
    {
      id: 101,
      title: "Building Microservices",
      authors: ["Sam Newman"],
      format: "paperback",
      is_digital: false,
      sku: "BK-001",
      isbn: "9781492034025",
      quantity: 2,
      unit_price_usd: "15.00",
      subtotal_usd: "30.00",
    },
  ],
  subtotal_usd: "30.00",
  discount_usd: "0.00",
  coupon_code: null,
  shipping_fee_usd: "2.00",
  tax_usd: "0.00",
  total_usd: "32.00",
  refunded_usd: "0.00",
  amount_to_collect_usd: "32.00",
  khr: {
    rate: "4000",
    rate_effective_at: "2026-10-15T00:00:00Z",
    total: "128000",
    amount_to_collect: "128000",
  },
};

describe("InvoiceSheet riel per line", () => {
  it("shows riel equivalent under line USD amount when exchange rate is present", () => {
    render(<InvoiceSheet doc={baseDoc} />);
    // Line subtotal $30.00 at rate 4000 should show ≈ 120,000 ៛
    expect(screen.getByText(/≈\s*120,000\s*៛/)).toBeInTheDocument();
  });

  it("shows nothing when no exchange rate was in force at the order date", () => {
    const docWithoutKhr = { ...baseDoc, khr: null };
    render(<InvoiceSheet doc={docWithoutKhr} />);
    expect(screen.queryByText(/≈.*៛/)).not.toBeInTheDocument();
  });
});

const paidKhqrDoc: OrderDocument = {
  ...baseDoc,
  id: 2,
  order_number: "ORD-2026-0002",
  status: "processing",
  payment_method: "khqr",
  payment_status: "succeeded",
  delivery_note: "Call on arrival",
  total_usd: "45.00",
  amount_to_collect_usd: "0.00",
  khr: {
    rate: "4000",
    rate_effective_at: "2026-10-15T00:00:00Z",
    total: "180000",
    amount_to_collect: "0",
  },
};

describe("DeliveryManifestSheet and multi-invoice print", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearSession("staff");
  });

  it("summarises COD cash to collect, prepaid stops, and delivery notes on DeliveryManifestSheet", () => {
    render(<DeliveryManifestSheet docs={[baseDoc, paidKhqrDoc]} staffName="Danish" />);
    expect(screen.getByText("Delivery manifest")).toBeInTheDocument();
    expect(screen.getByText(/2 stops · 4 books/)).toBeInTheDocument();
    expect(screen.getByText("Note: Call on arrival")).toBeInTheDocument();
    expect(screen.getByText("Paid · $0")).toBeInTheDocument();
    expect(screen.getAllByText("$32.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Courier name & signature")).toBeInTheDocument();
  });

  it("renders two invoices together in one batch on OrderDocumentsPrintPage", async () => {
    setSession("staff", {
      token: "t",
      expiresAt: null,
      user: { id: 1, name: "Danish", email: "danish@bookly.test", role: "admin", two_factor_enabled: true },
    });
    vi.spyOn(opsApi, "orderDocuments").mockResolvedValue([baseDoc, paidKhqrDoc]);

    renderWithProviders(<OrderDocumentsPrintPage />, { route: "/admin/print?doc=invoice&ids=1,2" });

    expect(await screen.findByText("ORD-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("ORD-2026-0002")).toBeInTheDocument();
    expect(screen.getByText(/2 invoices · Total \$77\.00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Delivery manifest" })).toHaveAttribute("href", "/admin/print?doc=manifest&ids=1,2");
  });

  it("prints daily sales with COD vs KHQR cash settlement and excludes cancelled orders from totals", async () => {
    setSession("staff", {
      token: "t",
      expiresAt: null,
      user: { id: 1, name: "Danish", email: "danish@bookly.test", role: "staff", two_factor_enabled: true },
    });
    const orders: StaffOrder[] = [
      {
        id: 10,
        order_number: "ORD-DAY-1",
        status: "delivered",
        placed_at: "2026-11-22T09:00:00Z",
        payment_method: "cod",
        payment_status: "succeeded",
        customer: { id: 1, name: "Dara", email: "dara@example.com" },
        item_count: 3,
        subtotal_usd: "30.00",
        discount_usd: "0.00",
        shipping_fee_usd: "0.00",
        total_usd: "30.00",
        total_khr: "120000",
        allowed_next_statuses: [],
      },
      {
        id: 11,
        order_number: "ORD-DAY-2",
        status: "shipped",
        placed_at: "2026-11-22T11:00:00Z",
        payment_method: "cod",
        payment_status: "pending",
        customer: { id: 2, name: "Sothea", email: "sothea@example.com" },
        item_count: 2,
        subtotal_usd: "20.00",
        discount_usd: "2.00",
        shipping_fee_usd: "2.00",
        total_usd: "20.00",
        total_khr: "80000",
        coupon_code: "SAVE10",
        allowed_next_statuses: ["delivered"],
      },
      {
        id: 12,
        order_number: "ORD-DAY-3",
        status: "processing",
        placed_at: "2026-11-22T13:00:00Z",
        payment_method: "khqr",
        payment_status: "succeeded",
        customer: { id: 3, name: "Bopha", email: "bopha@example.com" },
        item_count: 1,
        subtotal_usd: "15.00",
        discount_usd: "0.00",
        shipping_fee_usd: "0.00",
        total_usd: "15.00",
        total_khr: "60000",
        allowed_next_statuses: ["shipped"],
      },
      {
        id: 13,
        order_number: "ORD-DAY-4",
        status: "cancelled",
        placed_at: "2026-11-22T14:00:00Z",
        payment_method: "cod",
        payment_status: "pending",
        customer: { id: 4, name: "Vanna", email: "vanna@example.com" },
        item_count: 1,
        subtotal_usd: "99.00",
        discount_usd: "0.00",
        shipping_fee_usd: "0.00",
        total_usd: "99.00",
        total_khr: "396000",
        allowed_next_statuses: [],
      },
    ];
    vi.spyOn(opsApi, "orders").mockResolvedValue({
      data: orders,
      meta: { current_page: 1, last_page: 1, per_page: 100, total: orders.length, from: 1, to: orders.length },
    } as Paginated<StaffOrder>);

    renderWithProviders(<DailySalesPrintPage />, { route: "/admin/print/daily-sales?from=2026-11-22&to=2026-11-22" });

    expect(await screen.findByText("ORD-DAY-1")).toBeInTheDocument();
    expect(screen.getByText("Daily sales & settlement")).toBeInTheDocument();
    expect(screen.getByText(/3 active orders · \$65\.00/)).toBeInTheDocument();
    expect(screen.getByText("Total settled (Cash collected + KHQR paid)")).toBeInTheDocument();
    // Settled = $30 COD paid + $15 KHQR paid = $45.00
    expect(screen.getAllByText("$45.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Outstanding COD cash with courier / awaiting delivery")).toBeInTheDocument();
    expect(screen.getByText("Excluded: cancelled orders")).toBeInTheDocument();
  });
});
