import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { creditApi, type GiftCard } from "@/api/endpoints/credit";
import { renderWithProviders } from "@/test/render";
import GiftCardsPage from "./GiftCardsPage";
import ReferralsPage from "./ReferralsPage";

const card: GiftCard = { id: 3, amount_usd: "10.00", recipient_name: "Reader", recipient_email: "reader@example.test", message: null, send_on: "2026-11-06", status: "pending_payment", last_four: "ABCD", expires_at: null, can_reveal: false, email_sent_at: null, email_failed_at: null };
afterEach(() => vi.restoreAllMocks());

it("hides disabled customer features without requesting protected data", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ gift_cards: false, referrals: false });
  const purchases = vi.spyOn(creditApi, "purchases");
  renderWithProviders(<GiftCardsPage />);
  await waitFor(() => expect(screen.queryByText("Loading…")).not.toBeInTheDocument());
  expect(purchases).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Buy a gift card" })).not.toBeInTheDocument();
});

it("buys with a stable retry key and does not offer simulated gift activation", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ gift_cards: true, referrals: false });
  vi.spyOn(creditApi, "purchases").mockResolvedValue({ data: [], balance_usd: "0.00", current_page: 1, last_page: 1 });
  const buy = vi.spyOn(creditApi, "buy").mockRejectedValueOnce(new Error("Connection lost")).mockResolvedValueOnce(card);
  vi.spyOn(creditApi, "payment").mockResolvedValue({ data: card, payment: { qr_payload: "not-a-live-qr", mode: "test", expires_at: "2026-11-06T12:00:00Z" } });
  const user = userEvent.setup(); renderWithProviders(<GiftCardsPage />);
  await user.type(await screen.findByLabelText("Recipient name"), "Reader");
  await user.type(screen.getByLabelText("Recipient email"), "reader@example.test");
  await user.click(screen.getByRole("button", { name: "Continue to KHQR" }));
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Continue to KHQR" }));
  await screen.findByText(/Test mode: gift cards cannot be activated/);
  expect(buy).toHaveBeenCalledTimes(2);
  expect(buy.mock.calls[0][1]).toBe(buy.mock.calls[1][1]);
  expect(screen.queryByRole("button", { name: /simulate/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /KHQR/ })).not.toBeInTheDocument();
});

it("redeems privately and refreshes the wallet balance", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ gift_cards: true, referrals: false });
  const purchases = vi.spyOn(creditApi, "purchases").mockResolvedValue({ data: [], balance_usd: "0.00", current_page: 1, last_page: 1 });
  vi.spyOn(creditApi, "redeem").mockImplementation(async () => { purchases.mockResolvedValue({ data: [], balance_usd: "10.00", current_page: 1, last_page: 1 }); return { balance_usd: "10.00" }; });
  const user = userEvent.setup(); renderWithProviders(<GiftCardsPage />);
  await user.type(await screen.findByLabelText("Gift card code"), "ABCDEFGHJKLMNPQR");
  await user.click(screen.getByRole("button", { name: "Redeem gift card" }));
  await screen.findByText("Gift card redeemed. Your balance is ready to use at checkout.");
  expect(screen.getByLabelText("Gift card code")).toHaveValue("");
  await screen.findByText("$10.00", { selector: "strong" });
});

it("shows referral terms, status and safe share links without friend personal data", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ gift_cards: false, referrals: true });
  vi.spyOn(creditApi, "referrals").mockResolvedValue({ code: "ABCDEF1234567890", friend_discount_usd: "2.00", reward_usd: "2.00", balance_usd: "2.00", history: [{ id: 7, status: "rewarded", reward_cents: 200, created_at: "2026-11-06", rewarded_at: "2026-11-06" }], current_page: 1, last_page: 1 });
  renderWithProviders(<ReferralsPage />);
  expect(await screen.findByLabelText("Your referral link")).toHaveValue(`${window.location.origin}/?ref=ABCDEF1234567890`);
  expect(screen.getByText(/Reward credited/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", expect.stringContaining("ABCDEF1234567890"));
});
