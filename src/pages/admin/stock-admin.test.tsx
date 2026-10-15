import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { staffApi, type InventoryMovementItem, type StaffUser, type StockItem } from "@/api/endpoints/staff";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import StockAdminPage from "./StockAdminPage";

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staff: StaffUser = { ...admin, id: 2, name: "Demo Staff", email: "staff@bookly.test", role: "staff" };
const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[]) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length, from: 1, to: data.length } }) as never;

const sampleStock: StockItem[] = [
  {
    id: 101,
    book_id: 1,
    book_title: "Pride and Prejudice",
    format: "paperback",
    sku: "BK001-PB",
    isbn: "9791010010011",
    price_usd: "12.99",
    stock_quantity: 0,
    low_stock_threshold: 5,
    status: "out",
    is_active: true,
    cover_image_url: null,
  },
  {
    id: 102,
    book_id: 2,
    book_title: "The Hound of the Baskervilles",
    format: "hardcover",
    sku: "BK006-HC",
    isbn: null,
    price_usd: "18.99",
    stock_quantity: 3,
    low_stock_threshold: 5,
    status: "low",
    is_active: true,
    cover_image_url: null,
  },
  {
    id: 103,
    book_id: 3,
    book_title: "Emma",
    format: "paperback",
    sku: "BK002-PB",
    isbn: null,
    price_usd: "11.99",
    stock_quantity: 25,
    low_stock_threshold: 5,
    status: "in_stock",
    is_active: true,
    cover_image_url: null,
  },
];

const sampleMovements: InventoryMovementItem[] = [
  {
    id: 1,
    book_variant_id: 101,
    change_qty: 20,
    reason: "restock",
    reference: null,
    staff: { id: 1, name: "Demo Admin" },
    note: "Initial delivery",
    supplier: "Phnom Penh Book Co",
    stock_after: 20,
    unit_cost_usd: "4.50",
    created_at: "2026-10-15T10:00:00Z",
  },
  {
    id: 2,
    book_variant_id: 101,
    change_qty: -20,
    reason: "sale",
    reference: { type: "order", id: 10, order_number: "ORD-20261015-00010" },
    staff: null,
    note: null,
    supplier: null,
    stock_after: 0,
    created_at: "2026-10-15T12:00:00Z",
  },
];

describe("StockAdminPage", () => {
  afterEach(() => {
    clearSession("staff");
    vi.restoreAllMocks();
  });

  it("renders physical variants list with title, SKU, format, and status badges", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "stock").mockResolvedValue(page(sampleStock));

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/stock" element={<StockAdminPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/stock" }
    );

    expect(await screen.findByText("Pride and Prejudice")).toBeInTheDocument();
    expect(screen.getByText("BK001-PB")).toBeInTheDocument();
    expect(screen.getByText("The Hound of the Baskervilles")).toBeInTheDocument();
    expect(screen.getByText("BK006-HC")).toBeInTheDocument();
    expect(screen.getByText("Emma")).toBeInTheDocument();
    expect(screen.getByText("BK002-PB")).toBeInTheDocument();

    expect(screen.getAllByText("Out of stock").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Low stock").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("opens restock dialog, submits restock, and closes on success", async () => {
    signIn(admin);
    const user = userEvent.setup();
    vi.spyOn(staffApi, "stock").mockResolvedValue(page(sampleStock));
    const restockSpy = vi.spyOn(staffApi, "restockVariant").mockResolvedValue({
      variant: {
        id: 101,
        book_id: 1,
        format: "paperback",
        sku: "BK001-PB",
        isbn: null,
        price_usd: "12.99",
        price_khr: null,
        stock_quantity: 15,
        low_stock_threshold: 5,
        is_low_stock: false,
        is_active: true,
        in_stock: true,
        cover_image_url: null,
      },
      movement: sampleMovements[0],
    });

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/stock" element={<StockAdminPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/stock" }
    );

    expect(await screen.findByText("Pride and Prejudice")).toBeInTheDocument();

    const restockButtons = screen.getAllByRole("button", { name: /restock/i });
    await user.click(restockButtons[0]);

    expect(await screen.findByRole("heading", { name: /restock/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/cost per unit/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/quantity received/i), "15");
    await user.type(screen.getByLabelText(/cost per unit/i), "4.50");
    await user.type(screen.getByLabelText(/supplier/i), "Phnom Penh Book Co");

    await user.click(screen.getByRole("button", { name: /confirm restock/i }));

    await waitFor(() => {
      expect(restockSpy).toHaveBeenCalledWith(101, {
        quantity: 15,
        supplier: "Phnom Penh Book Co",
        unit_cost_usd: "4.50",
        note: null,
      });
    });
  });

  it("opens stock history drawer and displays movement records", async () => {
    signIn(admin);
    const user = userEvent.setup();
    vi.spyOn(staffApi, "stock").mockResolvedValue(page(sampleStock));
    vi.spyOn(staffApi, "stockHistory").mockResolvedValue(page(sampleMovements));

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/stock" element={<StockAdminPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/stock" }
    );

    expect(await screen.findByText("Pride and Prejudice")).toBeInTheDocument();

    const historyButtons = screen.getAllByLabelText(/stock history/i);
    await user.click(historyButtons[0]);

    expect(await screen.findByRole("heading", { name: /stock history/i })).toBeInTheDocument();
    expect(await screen.findByText("+20")).toBeInTheDocument();
    expect(screen.getByText("-20")).toBeInTheDocument();
    expect(screen.getByText("Initial delivery")).toBeInTheDocument();
    expect(screen.getByText("ORD-20261015-00010")).toBeInTheDocument();
  });
});
