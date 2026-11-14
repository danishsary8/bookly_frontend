import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { staffApi, type StaffUser } from "@/api/endpoints/staff";
import { clearSession, setSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import BooksPage from "./BooksPage";

/* Finding a book (owner 2026-11-14): results follow the search box as you type; shelf, format and stock filters. */
const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const empty = { data: [], links: {}, meta: { current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null } };

afterEach(() => {
  vi.restoreAllMocks();
  clearSession("staff");
});

describe("staff books search", () => {
  it("searches as you type and narrows by category, format and stock", async () => {
    const user = userEvent.setup();
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    const books = vi.spyOn(staffApi, "books").mockResolvedValue(empty as never);
    vi.spyOn(catalogApi, "categoryTree").mockResolvedValue([{ id: 7, name: "Fiction", children: [{ id: 8, name: "Classics", children: [] }] }] as never);
    renderWithProviders(<Routes><Route path="/admin/books" element={<BooksPage />} /></Routes>, { route: "/admin/books" });

    await user.type(await screen.findByRole("searchbox", { name: /Search books/ }), "austen");
    await waitFor(() => expect(books).toHaveBeenLastCalledWith(expect.objectContaining({ q: "austen" })));

    await user.selectOptions(await screen.findByLabelText("Category"), "8");
    await waitFor(() => expect(books).toHaveBeenLastCalledWith(expect.objectContaining({ q: "austen", category_id: 8 })));
    await user.selectOptions(screen.getByLabelText("Format"), "ebook");
    await user.selectOptions(screen.getByLabelText("Stock"), "low");
    await waitFor(() => expect(books).toHaveBeenLastCalledWith(expect.objectContaining({ format: "ebook", stock: "low" })));
    expect(await screen.findByText("No books match \"austen\"")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(books).toHaveBeenLastCalledWith(expect.not.objectContaining({ q: "austen" })));
    expect(screen.getByRole("searchbox", { name: /Search books/ })).toHaveValue("");
  });
});
