import { afterEach, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { creditApi } from "@/api/endpoints/credit";
import { staffCreditApi } from "@/api/endpoints/staffCredit";
import { renderWithProviders } from "@/test/render";
import GiftCardsPage from "./GiftCardsPage";
import ReferralsPage from "./ReferralsPage";

afterEach(() => vi.restoreAllMocks());
it("explains manual gift enablement and does not call the disabled money API", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ gift_cards: false, referrals: false });
  const list = vi.spyOn(staffCreditApi, "gifts");
  renderWithProviders(<GiftCardsPage />);
  await screen.findByRole("heading", { name: "Gift cards are unavailable" });
  expect(list).not.toHaveBeenCalled();
});
it("explains manual referral enablement without changing any settings", async () => {
  vi.spyOn(creditApi, "features").mockResolvedValue({ gift_cards: false, referrals: false });
  const list = vi.spyOn(staffCreditApi, "referrals");
  renderWithProviders(<ReferralsPage />);
  await screen.findByRole("heading", { name: "Referrals are unavailable" });
  expect(list).not.toHaveBeenCalled();
});
