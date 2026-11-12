import { describe, expect, it } from "vitest";
import { curatedBooks } from "./curatedBooks";
import { parseBookFilters, toSearchParams, withFilter } from "@/lib/catalog";

const books = [
  { id: 1, title: "River", authors: [{ name: "Soth" }], price_from_usd: "12", in_stock: false },
  { id: 2, title: "Garden", authors: [{ name: "Dara" }], price_from_usd: "4", in_stock: true },
];
describe("curated catalogue URL state", () => {
  it("preserves the editor's order unless explicitly sorted", () => {
    expect(curatedBooks(books, new URLSearchParams()).books.map(b => b.id)).toEqual([1, 2]);
    expect(curatedBooks(books, new URLSearchParams("sort=price_asc")).books.map(b => b.id)).toEqual([2, 1]);
    expect(books.map(b => b.id)).toEqual([1, 2]);
  });
  it("searches authors and retains stock restrictions", () => {
    expect(curatedBooks(books, new URLSearchParams("q=soth")).total).toBe(1);
    expect(curatedBooks(books, new URLSearchParams("q=soth&in_stock=1")).total).toBe(0);
  });
  it("clamps old page links and rejects malformed page values", () => {
    expect(curatedBooks(books, new URLSearchParams("page=999")).page).toBe(1);
    expect(curatedBooks(books, new URLSearchParams("page=NaN")).books).toHaveLength(2);
  });
  it("round trips a Home handoff, resets pagination on filtering and removes sort independently", () => {
    const initial = parseBookFilters(new URLSearchParams("has_ebook=1&format=ebook&max_price=4.99&sort=price_asc&page=3"));
    const narrowed = withFilter(initial, "language", "km");
    expect(toSearchParams(narrowed).get("page")).toBeNull();
    expect(parseBookFilters(toSearchParams(narrowed))).toMatchObject({ format: "ebook", has_ebook: true, max_price: 4.99, sort: "price_asc", language: "km" });
    expect(toSearchParams(withFilter(narrowed, "sort", undefined)).get("sort")).toBeNull();
    expect(toSearchParams(withFilter(narrowed, "sort", undefined)).get("format")).toBe("ebook");
  });
});
