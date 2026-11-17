import { afterEach, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { creditApi } from "@/api/endpoints/credit";
import { renderWithProviders } from "@/test/render";
import { clearSession } from "@/api/session";
import ReferralsPage from "./ReferralsPage";

afterEach(() => { vi.restoreAllMocks(); clearSession("customer"); });

it("shows referral terms, status and safe share links without friend personal data", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ referrals: true });
  vi.spyOn(creditApi, "referrals").mockResolvedValue({ code: "ABCDEF1234567890", friend_discount_usd: "2.00", reward_usd: "2.00", balance_usd: "2.00", history: [{ id: 7, status: "rewarded", reward_cents: 200, created_at: "2026-11-06", rewarded_at: "2026-11-06" }], current_page: 1, last_page: 1 });
  renderWithProviders(<ReferralsPage />);
  expect(await screen.findByLabelText("Your referral link")).toHaveValue(`${window.location.origin}/?ref=ABCDEF1234567890`);
  expect(screen.getByText(/Reward credited/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", expect.stringContaining("ABCDEF1234567890"));
});
