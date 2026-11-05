import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "@/api/endpoints/catalog";
import { staffApi } from "@/api/endpoints/staff";
import { clearSession, setSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import LookupPage from "./LookupPage";

const cat = (id: number, name: string, parent_id: number | null, sort_order = 10) => ({ id, name, slug: name.toLowerCase(), parent_id, sort_order, icon: null, books_count: 1 });

beforeEach(() => {
  setSession("staff", { token: "t", expiresAt: null, user: { id: 1, name: "Admin", email: "a@b.c", role: "admin" } } as never);
  vi.spyOn(catalogApi, "categories").mockResolvedValue([cat(3, "Fantasy", 1), cat(2, "Kids", null, 20), cat(1, "Fiction", null, 10), cat(4, "Romance", 1, 5)] as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  clearSession("staff");
});

describe("Admin categories as a tree", () => {
  it("lists parents in menu order with their sub-categories under them, and sets a parent and order", async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(staffApi, "updateLookup").mockResolvedValue({} as never);
    renderWithProviders(
      <Routes>
        <Route path="/admin/categories" element={<LookupPage kind="categories" />} />
      </Routes>,
      { route: "/admin/categories" },
    );
    const rows = await screen.findAllByRole("rowheader");
    expect(rows.map((r) => r.textContent)).toEqual(["Fiction", "Sub-category: Romance", "Sub-category: Fantasy", "Kids"]);

    await user.click(screen.getByRole("button", { name: "Edit Kids" }));
    const dialog = await screen.findByRole("dialog");
    const parent = within(dialog).getByLabelText(/Parent category/);
    expect(within(parent).getAllByRole("option").map((o) => o.textContent)).toEqual(["None (top-level)", "Fiction"]);
    await user.selectOptions(parent, "1");
    await user.clear(within(dialog).getByLabelText(/Order/));
    await user.type(within(dialog).getByLabelText(/Order/), "30");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith("categories", 2, expect.objectContaining({ parent_id: 1, sort_order: 30, name: "Kids" }));
  });

  it("keeps a category with sub-categories top-level", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/admin/categories" element={<LookupPage kind="categories" />} />
      </Routes>,
      { route: "/admin/categories" },
    );
    await user.click(await screen.findByRole("button", { name: "Edit Fiction" }));
    expect(within(await screen.findByRole("dialog")).getByLabelText(/Parent category/)).toBeDisabled();
  });
  it("lets admins pick an icon for top-level categories and sends it on save", async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(staffApi, "updateLookup").mockResolvedValue({} as never);
    renderWithProviders(
      <Routes>
        <Route path="/admin/categories" element={<LookupPage kind="categories" />} />
      </Routes>,
      { route: "/admin/categories" },
    );
    await user.click(await screen.findByRole("button", { name: "Edit Fiction" }));
    const dialog = await screen.findByRole("dialog");
    const bookOpenBtn = within(dialog).getByRole("radio", { name: "Open book" });
    await user.click(bookOpenBtn);
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith("categories", 1, expect.objectContaining({ icon: "book-open" }));
  });

  it("sends null for icon when 'No icon' is selected", async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(staffApi, "updateLookup").mockResolvedValue({} as never);
    renderWithProviders(
      <Routes>
        <Route path="/admin/categories" element={<LookupPage kind="categories" />} />
      </Routes>,
      { route: "/admin/categories" },
    );
    await user.click(await screen.findByRole("button", { name: "Edit Fiction" }));
    const dialog = await screen.findByRole("dialog");
    const noIconBtn = within(dialog).getByRole("radio", { name: "No icon" });
    await user.click(noIconBtn);
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith("categories", 1, expect.objectContaining({ icon: null }));
  });

  it("does not show the icon picker for sub-categories", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/admin/categories" element={<LookupPage kind="categories" />} />
      </Routes>,
      { route: "/admin/categories" },
    );
    await user.click(await screen.findByRole("button", { name: "Edit Romance" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("radio", { name: "No icon" })).not.toBeInTheDocument();
  });
});
