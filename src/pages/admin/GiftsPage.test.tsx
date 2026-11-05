import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { giftsApi } from "@/api/endpoints/gifts";
import { setSession, clearSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import GiftsPage from "./GiftsPage";

afterEach(() => { vi.restoreAllMocks(); clearSession("staff"); });

it("shows low gift stock and lets admins edit stock", async () => {
  setSession("staff", { token: "test", expiresAt: null, user: { id: 1, role: "admin" } });
  vi.spyOn(giftsApi, "list").mockResolvedValue([{ id: 1, name_en: "Pen", name_km: "ប៊ិច", stock: 2, is_active: true }]);
  const save = vi.spyOn(giftsApi, "save").mockResolvedValue({});
  const user = userEvent.setup();
  renderWithProviders(<GiftsPage />);
  expect(await screen.findByText("Low gift stock")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Edit" }));
  const stock = screen.getByLabelText("Stock");
  await user.clear(stock);
  await user.type(stock, "12");
  await user.click(screen.getByRole("button", { name: "Save gift" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(1, expect.objectContaining({ stock: 12 })));
});
