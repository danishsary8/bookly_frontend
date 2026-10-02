import { describe, expect, it } from "vitest";
import { formatKhr, formatMoney, formatUsd, getCurrency, setCurrency } from "./currency";

describe("currency", () => {
  it("formats dollars and riel", () => {
    expect(formatUsd("1234.5")).toBe("$1,234.50");
    expect(formatKhr("84050")).toBe("84,050 ៛");
  });

  it("shows the chosen currency, falling back to dollars without a riel price", () => {
    expect(formatMoney("20.50", "84050", "KHR")).toBe("84,050 ៛");
    expect(formatMoney("20.50", "84050", "USD")).toBe("$20.50");
    expect(formatMoney("20.50", null, "KHR")).toBe("$20.50");
  });

  it("remembers the choice", () => {
    setCurrency("KHR");
    expect(getCurrency()).toBe("KHR");
    expect(window.localStorage.getItem("bookly.currency")).toBe("KHR");
    setCurrency("USD");
  });
});
