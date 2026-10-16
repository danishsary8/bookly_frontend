import { describe, expect, it } from "vitest";
import {
  formatShopDateTime,
  fromShopInput,
  shopInputDate,
  toShopInput,
} from "./shopTime";

describe("shop time (Cambodia, UTC+7)", () => {
  it("shows an API time in Cambodia time whatever the browser's zone", () => {
    expect(toShopInput("2026-10-20T02:00:00Z")).toBe("2026-10-20T09:00");
    expect(toShopInput("2026-10-20T20:30:00+00:00")).toBe("2026-10-21T03:30");
    expect(toShopInput(null)).toBe("");
  });

  it("sends a typed time with the shop's offset, and round-trips", () => {
    expect(fromShopInput("2026-10-20T09:00")).toBe("2026-10-20T09:00:00+07:00");
    expect(shopInputDate("2026-10-20T09:00").toISOString()).toBe(
      "2026-10-20T02:00:00.000Z",
    );
    expect(toShopInput(shopInputDate("2026-12-31T23:59").toISOString())).toBe(
      "2026-12-31T23:59",
    );
    expect(Number.isNaN(shopInputDate("").getTime())).toBe(true);
  });

  it("formats for display in shop time", () => {
    expect(formatShopDateTime("2026-10-20T02:00:00Z")).toBe(
      "20 Oct 2026, 09:00",
    );
  });
});
