import { afterEach, expect, it, vi } from "vitest";
import { api } from "../client";
import { creditApi } from "./credit";

afterEach(() => vi.restoreAllMocks());
it("enables money features only for explicit boolean flags", async () => {
  vi.spyOn(api, "get").mockResolvedValueOnce({}).mockResolvedValueOnce({ data: { referrals: "true" } }).mockResolvedValueOnce({ data: { referrals: true } });
  expect(await creditApi.features()).toEqual({ referrals: false });
  expect(await creditApi.features()).toEqual({ referrals: false });
  expect(await creditApi.features()).toEqual({ referrals: true });
});
