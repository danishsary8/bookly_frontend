import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { supportApi, type Conversation } from "@/api/endpoints/support";
import { setSession, clearSession } from "@/api/session";
import type { Customer, Paginated } from "@/api/types";
import { renderWithProviders } from "@/test/render";
import { SupportBubble } from "./SupportBubble";
import { ConversationView } from "./ConversationView";
import SupportInboxPage from "@/pages/admin/SupportInboxPage";
import { en } from "@/i18n/en";

const conversation: Conversation = { id: 1, topic: "other", order_id: null, status: "open", assigned_staff_id: null, last_message_at: null, closed_at: null, unread_count: 0, messages: [{ id: 1, sender: "customer", body: "Please help https://example.test", is_internal: false, created_at: "2026-11-05T10:00:00Z", read_at: null }], rating: null };
afterEach(() => { clearSession("customer"); clearSession("staff"); vi.restoreAllMocks(); localStorage.removeItem("bookly.support.1"); });
it("opens the guest form, sends a confirmation reference and returns keyboard focus", async () => {
  const send = vi.spyOn(supportApi, "guest").mockResolvedValue({ id: 31 });
  const user = userEvent.setup(); renderWithProviders(<SupportBubble />);
  const trigger = screen.getByRole("button", { name: en.support.open });
  await user.click(trigger);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: en.assistant.human }));
  await user.type(screen.getByLabelText(en.support.name), "Reader");
  await user.type(screen.getByLabelText(en.support.email), "reader@example.test");
  await user.type(screen.getByLabelText(en.support.message), "Help please");
  await user.click(screen.getByRole("button", { name: en.support.send }));
  await screen.findByText(/#31/);
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ message: "Help please" }));
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
});
it("renders plain messages without turning URLs into links, and rates closed chat once", async () => {
  setSession<Customer>("customer", { token: "test", expiresAt: null, user: { id: 1, name: "Reader", email: "reader@example.test", verified: true } });
  vi.spyOn(supportApi, "show").mockResolvedValue({ value: { data: { ...conversation, status: "closed" } } });
  const rate = vi.spyOn(supportApi, "rate").mockResolvedValue(undefined);
  const user = userEvent.setup(); renderWithProviders(<ConversationView id={1} />);
  await screen.findByText(conversation.messages![0].body);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("radio")[4]);
  await user.click(screen.getByRole("button", { name: en.support.rate }));
  await waitFor(() => expect(rate).toHaveBeenCalledWith(1, 5, ""));
});
it("staff inbox shows unread conversations and keeps support permission separate", async () => {
  setSession("staff", { token: "test", expiresAt: null, user: { id: 4, role: "staff", name: "Staff", permissions: ["support:manage"] } });
  vi.spyOn(supportApi, "list").mockResolvedValue({ value: { data: [{ ...conversation, unread_count: 2 }], meta: { total: 1, last_page: 1 } } as Paginated<Conversation> });
  vi.spyOn(supportApi, "templates").mockResolvedValue([]);
  renderWithProviders(<SupportInboxPage />);
  await screen.findByRole("button", { name: /#1.*\(2\)/ });
  expect(screen.getByLabelText(en.support.unreadOnly)).toBeInTheDocument();
  expect(screen.queryByText(en.support.binding)).not.toBeInTheDocument();
});

it("hides the bubble on payment and print routes", () => {
  renderWithProviders(<SupportBubble />, { route: "/account/orders/1/pay" });
  expect(screen.queryByRole("button", { name: en.support.open })).not.toBeInTheDocument();
});

it("loads successive pages of older messages beyond the first 200", async () => {
  setSession<Customer>("customer", { token: "test", expiresAt: null, user: { id: 1, name: "Reader", verified: true } });
  const messages = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({ ...conversation.messages![0], id: start + index, body: `Message ${start + index}` }));
  vi.spyOn(supportApi, "show").mockResolvedValue({ value: { data: { ...conversation, messages: messages(102, 100) } } });
  const older = vi.spyOn(supportApi, "older").mockResolvedValueOnce({ ...conversation, messages: messages(2, 100) }).mockResolvedValueOnce({ ...conversation, messages: messages(1, 1) });
  const user = userEvent.setup(); renderWithProviders(<ConversationView id={1} />);
  await user.click(await screen.findByRole("button", { name: en.support.previous }));
  await screen.findByText("Message 2", { exact: true });
  await user.click(screen.getByRole("button", { name: en.support.previous }));
  await screen.findByText("Message 1", { exact: true });
  expect(older).toHaveBeenNthCalledWith(1, 1, 102, false);
  expect(older).toHaveBeenNthCalledWith(2, 1, 2, false);
  expect(screen.queryByRole("button", { name: en.support.previous })).not.toBeInTheDocument();
});
