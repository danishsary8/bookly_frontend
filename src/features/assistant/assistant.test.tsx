import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { assistantApi } from "@/api/endpoints/assistant";
import { supportApi } from "@/api/endpoints/support";
import { clearSession, setSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import { en } from "@/i18n/en";
import { SupportBubble } from "@/features/support/SupportBubble";
import { AssistantPanel } from "./AssistantPanel";
import AssistantKnowledgePage from "@/pages/admin/AssistantKnowledgePage";

afterEach(() => { clearSession("customer"); clearSession("staff"); vi.restoreAllMocks(); });
it("offers an explicit human handoff with the question prefilled and does not send it automatically", async () => {
  vi.spyOn(assistantApi, "ask").mockResolvedValue({ intent: "unknown", text: "I could not understand that.", link: null, books: [], handoff: true });
  const guest = vi.spyOn(supportApi, "guest");
  const user = userEvent.setup(); renderWithProviders(<SupportBubble />);
  await user.click(screen.getByRole("button", { name: en.support.open }));
  expect(screen.getByRole("tab", { name: en.assistant.automatic })).toHaveAttribute("aria-selected", "true");
  await user.type(await screen.findByLabelText(en.assistant.question), "My unusual question");
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
  await user.click(await screen.findByRole("button", { name: en.assistant.delivery }));
  await user.click(await screen.findByRole("link", { name: en.assistant.title }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it.each(["admin", "staff"] as const)("lets %s teach a FAQ and reserves deletion for admins", async (role) => {
  setSession("staff", { token: "test", expiresAt: null, user: { id: 4, role, name: "Staff", permissions: ["support:manage"] } });
  vi.spyOn(assistantApi, "faqs").mockResolvedValue({ current_page: 1, last_page: 1, data: [{ id: 4, question_en: "Existing?", question_km: "សំណួរ?", answer_en: "Answer", answer_km: "ចម្លើយ", keywords: ["existing"], is_active: true, hits: 2 }] });
  vi.spyOn(assistantApi, "unanswered").mockResolvedValue({ current_page: 1, last_page: 1, data: [{ id: 7, question: "Question from [email]", count: 2, last_seen: "2026-11-06T00:00:00Z" }] });
  const save = vi.spyOn(assistantApi, "save").mockResolvedValue(undefined);
  const remove = vi.spyOn(assistantApi, "remove").mockResolvedValue(undefined);
  const user = userEvent.setup(); renderWithProviders(<AssistantKnowledgePage />);
  await user.click(await screen.findByRole("button", { name: en.assistant.teach }));
  expect(screen.getByLabelText(en.assistant.questionEn)).toHaveValue("Question from [email]");
  await user.type(screen.getByLabelText(en.assistant.questionKm), "សំណួរ?");
  await user.type(screen.getByLabelText(en.assistant.answerEn), "An answer");
  await user.type(screen.getByLabelText(en.assistant.answerKm), "ចម្លើយ");
  await user.type(screen.getByLabelText(en.assistant.keywords), "question, សំណួរ");
  await user.click(screen.getByRole("button", { name: en.assistant.save }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ unanswered_id: 7, keywords: ["question", "សំណួរ"] }), undefined));
  if (role === "staff") {
    expect(screen.queryByRole("button", { name: en.assistant.remove })).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    return;
  }
  await user.click(screen.getByRole("button", { name: en.assistant.remove }));
  const confirm = screen.getByRole("alertdialog");
  expect(remove).not.toHaveBeenCalled();
  await user.click(within(confirm).getByRole("button", { name: en.assistant.remove }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith(4));
});
