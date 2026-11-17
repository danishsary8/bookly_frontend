import { describe, expect, it } from "vitest";
import { charmPrice, profitOf, suggestSku } from "./pricing";

describe("book pricing helpers", () => {
  it("works out profit, margin and loss per copy", () => {
    expect(profitOf("20", "12.40")).toEqual({ kind: "profit", amount: 7.6, margin: 0.38 });
    expect(profitOf("10.00", "12.50")).toMatchObject({ kind: "loss", amount: -2.5 });
    expect(profitOf("10", "")).toEqual({ kind: "none" });
    expect(profitOf("abc", "1")).toEqual({ kind: "none" });
  });

  it("offers a .99 price only when it changes something", () => {
    expect(charmPrice("12.40")).toBe("12.99");
    expect(charmPrice("12.99")).toBeNull();
    expect(charmPrice("")).toBeNull();
  });

  it("suggests a readable SKU from the title and format", () => {
    expect(suggestSku("English File: Intermediate Student's Book", "paperback")).toBe("ENGLISH-FILE-INTERME-PB");
    expect(suggestSku("The Cell", "ebook")).toBe("CELL-EB");
    expect(suggestSku("សៀវភៅ", "hardcover")).toBe("BOOK-HC");
  });
});
