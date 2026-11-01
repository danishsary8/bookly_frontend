import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { staffApi, type StaffUser } from "@/api/endpoints/staff";
import { opsApi, type StaffBookCollection } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import CollectionsAdminPage from "./CollectionsAdminPage";

/* /admin/collections (owner 2026-11-01: seasonal collections, books picked by hand, English + Khmer fields). */

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staff: StaffUser = { ...admin, id: 2, name: "Demo Staff", role: "staff" };
const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[]) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length } }) as never;

const rain: StaffBookCollection = {
  id: 1, slug: "rainy-season-reads", title_en: "Rainy season reads", title_km: "សៀវភៅរដូវវស្សា", description_en: "Cosy books.", description_km: null,
  starts_at: null, ends_at: "2026-11-30T16:59:59Z", is_active: true, position: 0, status: "live",
  books: [
    { id: 5, title: "The Sign of the Four", in_trash: false },
    { id: 1, title: "Pride and Prejudice", in_trash: false },
    { id: 9, title: "Old Book", in_trash: true },
  ],
};
const exam: StaffBookCollection = { ...rain, id: 2, slug: "exam-season", title_en: "Exam season", title_km: null, is_active: false, status: "hidden", position: 1, books: [] };

const app = () =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/collections" element={<CollectionsAdminPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>,
    { route: "/admin/collections" },
  );

beforeEach(() => {
  vi.spyOn(staffApi, "books").mockResolvedValue(page([{ id: 5, title: "The Sign of the Four" }, { id: 7, title: "Emma" }]));
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

describe("collections admin", () => {
  it("lists collections with status, books (trash apart), dates and a shop link for live ones", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "collections").mockResolvedValue(page([rain, exam]));
    app();
    const row = (await screen.findByRole("rowheader", { name: /Rainy season reads/ })).closest("tr")!;
    expect(within(row).getByText("Live")).toBeInTheDocument();
    expect(within(row).getByText("+1 in trash")).toBeInTheDocument();
    expect(within(row).getByText("Until 30 Nov 2026")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /Open Rainy season reads in the shop/ })).toHaveAttribute("href", "/collections/rainy-season-reads");
    const other = screen.getByRole("rowheader", { name: /Exam season/ }).closest("tr")!;
    expect(within(other).getByText("Off")).toBeInTheDocument();
    expect(within(other).queryByRole("link")).not.toBeInTheDocument();
  });

  it("staff see the list but cannot change it", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "collections").mockResolvedValue(page([rain]));
    app();
    await screen.findByRole("rowheader", { name: /Rainy season reads/ });
    expect(screen.getByText("Only admins create or change collections.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New collection/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Turn off Rainy season reads/ })).toBeDisabled();
  });

  it("says collections are not available yet on an API without them (404)", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "collections").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app();
    expect(await screen.findByText("Collections are not available yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New collection/ })).not.toBeInTheDocument();
  });

  it("creates a collection: titles in both languages, books added and reordered, off by default", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "collections").mockResolvedValue(page([]));
    const create = vi.spyOn(opsApi, "createCollection").mockResolvedValue({ ...exam, title_en: "Holiday gifts" });
    app();
    await user.click(await screen.findByRole("button", { name: /New collection/ }));
    const dialog = await screen.findByRole("dialog", { name: "New collection" });
    await user.click(within(dialog).getByRole("button", { name: "Create collection" }));
    expect(within(dialog).getByText("Give the collection an English title.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Title (English)"), "Holiday gifts");
    await user.type(within(dialog).getByLabelText(/Title \(Khmer\)/), "អំណោយ");
    const search = within(dialog).getByLabelText("Books");
    await user.type(search, "th");
    await user.click(await within(dialog).findByRole("button", { name: "The Sign of the Four" }));
    await user.type(search, "em");
    await user.click(await within(dialog).findByRole("button", { name: "Emma" }));
    await user.click(within(dialog).getByRole("button", { name: "Move Emma up" }));
    const order = within(within(dialog).getByRole("list", { name: /in order/ })).getAllByRole("listitem");
    expect(order[0]).toHaveTextContent("Emma");
    expect(within(dialog).getByRole("switch")).not.toBeChecked();

    await user.click(within(dialog).getByRole("button", { name: "Create collection" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ title_en: "Holiday gifts", title_km: "អំណោយ", description_en: null, position: 0, is_active: false, books: [7, 5] });
    expect(create.mock.calls[0][0]).not.toHaveProperty("slug"); // the API makes it from the English title
  });

  it("edit leaves books in the trash out and shows the API's field errors", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "collections").mockResolvedValue(page([rain]));
    const update = vi.spyOn(opsApi, "updateCollection").mockRejectedValue(
      new ApiError({ kind: "validation", status: 422, message: "Invalid.", fieldErrors: { slug: ["The slug has already been taken."] } }),
    );
    app();
    await user.click(await screen.findByRole("button", { name: "Edit Rainy season reads" }));
    const dialog = await screen.findByRole("dialog", { name: /Edit Rainy season reads/ });
    expect(within(dialog).getByText(/1 book is in the trash and will leave this collection when you save: Old Book/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save collection" }));
    expect(await within(dialog).findByText("The slug has already been taken.")).toBeInTheDocument();
    expect(update.mock.calls[0][1]).toMatchObject({ slug: "rainy-season-reads", books: [5, 1] });
  });

  it("the row switch turns a collection on", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "collections").mockResolvedValue(page([exam]));
    const update = vi.spyOn(opsApi, "updateCollection").mockResolvedValue({ ...exam, is_active: true, status: "live" });
    app();
    await user.click(await screen.findByRole("switch", { name: "Turn on Exam season" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(2, { is_active: true }));
    expect(await screen.findByText("Exam season is on")).toBeInTheDocument();
  });
});
