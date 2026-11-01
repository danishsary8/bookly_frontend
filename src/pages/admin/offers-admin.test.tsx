import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { staffApi, type StaffUser } from "@/api/endpoints/staff";
import { opsApi, type Offer } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import OffersAdminPage from "./OffersAdminPage";

/* /admin/offers (owner 2026-11-01: 1A table + dialog, 2A one search box, 3A preview, 4A row switch with confirm). */

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staff: StaffUser = { ...admin, id: 2, name: "Demo Staff", role: "staff" };
const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[]) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length } }) as never;

const holmes: Offer = {
  id: 1, name: "Buy 2 Holmes", type: "buy_n_percent", applies_to: "selected", min_quantity: 2, percent_off: "15.00",
  starts_at: null, ends_at: "2026-11-30T16:59:59Z", max_orders: 100, used_count: 3, is_active: true, status: "live",
  targets: [{ type: "series", id: 1, label: "Sherlock Holmes", in_trash: false }], orders_count: 3,
};
const paused: Offer = { ...holmes, id: 2, name: "Buy 3 anything", applies_to: "all", min_quantity: 3, percent_off: "10.00", is_active: false, status: "paused", targets: [], max_orders: null, used_count: 0, ends_at: null };

const app = () =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/offers" element={<OffersAdminPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>,
    { route: "/admin/offers" },
  );

beforeEach(() => {
  vi.spyOn(catalogApi, "categories").mockResolvedValue([{ id: 7, name: "Philosophy" }] as never);
  vi.spyOn(catalogApi, "seriesList").mockResolvedValue(page([{ id: 1, name: "Sherlock Holmes" }]));
  vi.spyOn(staffApi, "books").mockResolvedValue(page([{ id: 5, title: "The Sign of the Four" }]));
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

describe("offers admin", () => {
  it("lists offers with their status, books, uses and end date", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "offers").mockResolvedValue(page([holmes, paused]));
    app();
    const row = (await screen.findByRole("rowheader", { name: /Buy 2 Holmes/ })).closest("tr")!;
    expect(within(row).getByText("Buy 2, save 15%")).toBeInTheDocument();
    expect(within(row).getByText("Series: Sherlock Holmes")).toBeInTheDocument();
    expect(within(row).getByText("Live")).toBeInTheDocument();
    expect(within(row).getByText("3 / 100")).toBeInTheDocument();
    const other = screen.getByRole("rowheader", { name: /Buy 3 anything/ }).closest("tr")!;
    expect(within(other).getByText("All books")).toBeInTheDocument();
    expect(within(other).getByText("Paused")).toBeInTheDocument();
  });

  it("creates a chosen-books offer with the search box, shows the preview and starts it paused", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "offers").mockResolvedValue(page([]));
    const create = vi.spyOn(opsApi, "createOffer").mockResolvedValue({ ...holmes, is_active: false, status: "paused" });
    app();
    await user.click(await screen.findByRole("button", { name: "New offer" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Buy 2 Holmes");
    await user.clear(within(dialog).getByLabelText(/Percent off/));
    await user.type(within(dialog).getByLabelText(/Percent off/), "15");
    await user.type(within(dialog).getByLabelText("Books, categories or series"), "hol");
    await user.click(await within(dialog).findByRole("button", { name: /Series\s*Sherlock Holmes/ }));
    expect(within(dialog).getByRole("list", { name: "Chosen" })).toHaveTextContent("Series: Sherlock Holmes");

    // Live preview of what customers see.
    const preview = within(dialog).getByRole("region", { name: "What customers see" });
    expect(within(preview).getByText("Buy 2, save 15%")).toBeInTheDocument();
    expect(within(preview).getByText("Buy 2 from Sherlock Holmes, save 15%.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Create offer" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toEqual({
      name: "Buy 2 Holmes", applies_to: "selected", min_quantity: 2, percent_off: "15", starts_at: null, ends_at: null,
      max_orders: null, is_active: false, targets: [{ type: "series", id: 1 }],
    });
  });

  it("checks the numbers and the chosen books before saving, and shows the API's errors", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "offers").mockResolvedValue(page([]));
    const create = vi.spyOn(opsApi, "createOffer");
    app();
    await user.click(await screen.findByRole("button", { name: "New offer" }));
    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText(/Buy at least/));
    await user.type(within(dialog).getByLabelText(/Buy at least/), "1");
    await user.clear(within(dialog).getByLabelText(/Percent off/));
    await user.type(within(dialog).getByLabelText(/Percent off/), "60");
    await user.click(within(dialog).getByRole("button", { name: "Create offer" }));
    expect(within(dialog).getByText("Give the offer a name (only staff see it).")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a whole number from 2 to 20.")).toBeInTheDocument();
    expect(within(dialog).getByText(/at most 50/)).toBeInTheDocument();
    expect(within(dialog).getByText("Choose at least one book, category or series.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    create.mockRejectedValue(new ApiError({ kind: "validation", status: 422, message: "x", fieldErrors: { targets: ["Not found (or in the trash): series 1."] } }));
    await user.clear(within(dialog).getByLabelText(/Buy at least/));
    await user.type(within(dialog).getByLabelText(/Buy at least/), "2");
    await user.clear(within(dialog).getByLabelText(/Percent off/));
    await user.type(within(dialog).getByLabelText(/Percent off/), "10");
    await user.type(within(dialog).getByLabelText("Name"), "X");
    await user.click(within(dialog).getByRole("radio", { name: "All books" }));
    await user.click(within(dialog).getByRole("radio", { name: "Chosen books" }));
    await user.type(within(dialog).getByLabelText("Books, categories or series"), "phil");
    await user.click(await within(dialog).findByRole("button", { name: /Category\s*Philosophy/ }));
    await user.click(within(dialog).getByRole("button", { name: "Create offer" }));
    expect(await within(dialog).findByText("Not found (or in the trash): series 1.")).toBeInTheDocument();
  });

  it("asks before turning an offer on, but pauses at once", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "offers").mockResolvedValue(page([holmes, paused]));
    const update = vi.spyOn(opsApi, "updateOffer").mockResolvedValue(holmes);
    app();
    await user.click(await screen.findByRole("switch", { name: "Turn on Buy 3 anything" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText(/Customers buying 3 or more books from any books get 10% off each/)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole("button", { name: "Turn on" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(2, { is_active: true }));

    await user.click(screen.getByRole("switch", { name: "Pause Buy 2 Holmes" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, { is_active: false }));
  });

  it("lets staff see offers but not change them", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "offers").mockResolvedValue(page([holmes]));
    app();
    expect(await screen.findByText("Buy 2 Holmes")).toBeInTheDocument();
    expect(screen.getByText("Only admins create or change offers.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New offer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Buy 2 Holmes" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Pause Buy 2 Holmes" })).toBeDisabled();
  });

  it("says offers are not available yet when the API has no offers (404)", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "offers").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app();
    expect(await screen.findByText("Offers are not available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New offer" })).not.toBeInTheDocument();
  });
});
