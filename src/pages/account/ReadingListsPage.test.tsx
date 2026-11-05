import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readingListsApi, type ReadingList } from "@/api/endpoints/readingLists";
import { renderWithProviders } from "@/test/render";
import ReadingListsPage from "./ReadingListsPage";

const list: ReadingList = { id: 1, slug: "my-reads", title: "Weekend reads", description: "", is_public: false, is_staff_pick: false, owner_first_name: "Danish", books: [{ book: { id: 2, title: "Book title" }, position: 0, note: null }] };
afterEach(() => vi.restoreAllMocks());
it("creates private lists and toggles public access explicitly", async () => {
  vi.spyOn(readingListsApi, "own").mockResolvedValue([list]);
  const create = vi.spyOn(readingListsApi, "create").mockResolvedValue(list);
  const update = vi.spyOn(readingListsApi, "update").mockResolvedValue({ ...list, is_public: true });
  const user = userEvent.setup();
  renderWithProviders(<ReadingListsPage />);
  await user.type(screen.getByLabelText("List title"), "New list");
  await user.click(screen.getByRole("button", { name: "Create list" }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ title: "New list" }));
  await user.click(await screen.findByText("Weekend reads", { selector: "summary" }));
  await user.click(screen.getByLabelText("Public list"));
  await waitFor(() => expect(update).toHaveBeenCalledWith(1, { is_public: true }));
});
