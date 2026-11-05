import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { assistantApi } from "@/api/endpoints/assistant";
import { supportApi } from "@/api/endpoints/support";
import { clearSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import { en } from "@/i18n/en";
import { SupportBubble } from "@/features/support/SupportBubble";
import { AssistantPanel } from "./AssistantPanel";

afterEach(() => { clearSession("customer"); clearSession("staff"); vi.restoreAllMocks(); });
it("offers an explicit human handoff with the question prefilled and does not send it automatically", async () => {
  vi.spyOn(assistantApi, "ask").mockResolvedValue({ intent: "unknown", text: "I could not understand that.", link: null, books: [], handoff: true });
  const guest = vi.spyOn(supportApi, "guest");
  const user = userEvent.setup(); renderWithProviders(<SupportBubble />);
  await user.click(screen.getByRole("button", { name: en.support.open }));
  expect(screen.getByRole("tab", { name: en.assistant.automatic })).toHaveAttribute("aria-selected", "true");
  await user.type(screen.getByLabelText(en.assistant.question), "My unusual question");
  await user.click(screen.getByRole("button", { name: en.assistant.send }));
  await user.click(await screen.findByRole("button", { name: en.assistant.handoff }));
  expect(screen.getByLabelText(en.support.message)).toHaveValue("My unusual question");
  expect(guest).not.toHaveBeenCalled();
});
it("shows the staff response and a link without interpreting response text as markup", async () => {
  vi.spyOn(assistantApi, "staff").mockResolvedValue({ intent: "orders", text: "Orders waiting: 3.", link: "/admin/orders" });
  const user = userEvent.setup(); renderWithProviders(<AssistantPanel staff />);
  await user.type(screen.getByLabelText(en.assistant.question), "orders waiting");
  await user.click(screen.getByRole("button", { name: en.assistant.send }));
  await waitFor(() => expect(screen.getByText("Orders waiting: 3.")).toBeInTheDocument());
  expect(screen.getByRole("link")).toHaveAttribute("href", "/admin/orders");
});
it("closes the assistant dialog when a visitor follows an answer link", async () => {
  vi.spyOn(assistantApi, "ask").mockResolvedValue({ intent: "delivery", text: "Delivery details", link: "/shipping", books: [], handoff: false });
  const user = userEvent.setup(); renderWithProviders(<SupportBubble />);
  await user.click(screen.getByRole("button", { name: en.support.open }));
  await user.click(screen.getByRole("button", { name: en.assistant.delivery }));
  await user.click(await screen.findByRole("link", { name: en.assistant.title }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
