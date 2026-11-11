import { beforeEach, describe, expect, it } from "vitest";
import { promoStorage } from "./promoStorage";

describe("promoStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("shows a promotion once per visit", () => {
    expect(promoStorage.shouldShow(4)).toBe(true);
    promoStorage.markSeen(4);
    expect(promoStorage.shouldShow(4)).toBe(false);
    sessionStorage.clear(); // a new visit
    expect(promoStorage.shouldShow(4)).toBe(true);
  });

  it("hides a promotion for good after 'Don't show this again', but not the next promotion", () => {
    promoStorage.hideForGood(4);
    sessionStorage.clear();
    expect(promoStorage.shouldShow(4)).toBe(false);
    expect(promoStorage.shouldShow(5)).toBe(true);
  });
});
