import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { readingListsApi, type ReadingList } from "@/api/endpoints/readingLists";
import { clearSession, setSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import ReadingListPage from "./ReadingListPage";

export const list: ReadingList = { id: 1, slug: "my-reads", title: "Weekend reads", description: "A personal selection", is_public: true, is_staff_pick: false, owner_first_name: "Danish", books: [{ book: { id: 2, title: "Book title", formats: ["paperback"] }, note: "<script>unsafe()</script>", position: 0 }] };
afterEach(() => { vi.restoreAllMocks(); clearSession("customer"); });
const renderPage = () => renderWithProviders(<Routes><Route path="/lists/:slug" element={<ReadingListPage />} /></Routes>, { route: "/lists/my-reads" });

it("renders plain notes, first name and encoded share links", async () => {
  vi.spyOn(readingListsApi, "public").mockResolvedValue(list);
  const user = userEvent.setup();
  const { container } = renderPage();
  expect(await screen.findByRole("heading", { name: "Weekend reads" })).toBeInTheDocument();
  expect(screen.getByText("By Danish")).toBeInTheDocument();
  expect(screen.getByText("<script>unsafe()</script>")).toBeInTheDocument();
  expect(container.querySelector("script")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Share list" }));
  expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", expect.stringContaining("sharer.php?u="));
  expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", expect.stringContaining("text=Weekend%20reads"));
});

it("adds a public list with one batch request", async () => {
  setSession("customer", { token: "test", expiresAt: null, user: { id: 1 } });
  vi.spyOn(readingListsApi, "public").mockResolvedValue(list);
  const add = vi.spyOn(readingListsApi, "addAll").mockResolvedValue({ added: 1, skipped: 0 });
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole("button", { name: "Add all to cart" }));
  await waitFor(() => expect(add).toHaveBeenCalledWith("my-reads"));
});
