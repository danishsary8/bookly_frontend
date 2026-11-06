import { afterEach, expect, it, vi } from "vitest";
import { api } from "../client";
import { creditApi } from "./credit";

afterEach(() => vi.restoreAllMocks());
it("enables money features only for explicit boolean flags", async () => {
  vi.spyOn(api, "get").mockResolvedValueOnce({}).mockResolvedValueOnce({ data: { gift_cards: "true", referrals: true } });
  expect(await creditApi.features()).toEqual({ gift_cards: false, referrals: false });
  expect(await creditApi.features()).toEqual({ gift_cards: false, referrals: true });
});
