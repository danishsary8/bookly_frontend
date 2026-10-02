import { describe, expect, it } from "vitest";
import { activeFilterCount, clearFilters, effectiveSort, parseBookFilters, toSearchParams, withFilter } from "./catalog";

const parse = (query: string) => parseBookFilters(new URLSearchParams(query));

describe("parseBookFilters", () => {
  it("reads valid filters", () => {
    expect(parse("q=dune&category_id=2&format=ebook&in_stock=1&sort=rating&page=3&min_price=5&max_price=20.5")).toEqual({
      q: "dune",
      category_id: 2,
      author_id: undefined,
      series_id: undefined,
      publisher_id: undefined,
      format: "ebook",
      language: undefined,
      min_price: 5,
      max_price: 20.5,
      in_stock: true,
      sort: "rating",
      page: 3,
    });
  });

  it("drops malformed values instead of sending them", () => {
    const f = parse("category_id=abc&format=scroll&sort=random&page=0&min_price=-1&in_stock=yes&q=%20%20");
    expect(f.category_id).toBeUndefined();
    expect(f.format).toBeUndefined();
    expect(f.sort).toBeUndefined();
    expect(f.page).toBeUndefined();
    expect(f.min_price).toBeUndefined();
    expect(f.in_stock).toBeUndefined();
    expect(f.q).toBeUndefined();
  });

  it("swaps a reversed price range", () => {
    expect(parse("min_price=30&max_price=10")).toMatchObject({ min_price: 10, max_price: 30 });
  });
});

describe("toSearchParams", () => {
  it("round-trips and keeps the query string minimal", () => {
    const query = "q=dune&category_id=2&in_stock=1&sort=rating&page=2";
    expect(toSearchParams(parse(query)).toString()).toBe(query);
    expect(toSearchParams(parse("page=1")).toString()).toBe("");
  });
});

describe("filter helpers", () => {
  it("resets the page when a filter changes", () => {
    expect(withFilter({ page: 4, format: "ebook" }, "format", "paperback")).toEqual({ format: "paperback" });
    expect(withFilter({ page: 4 }, "page", 5)).toEqual({ page: 5 });
  });

  it("counts and clears only real filters", () => {
    const f = { q: "x", sort: "rating" as const, page: 2, format: "ebook" as const, in_stock: true };
    expect(activeFilterCount(f)).toBe(2);
    expect(clearFilters(f)).toEqual({ q: "x", sort: "rating" });
  });

  it("defaults the sort like the API", () => {
    expect(effectiveSort({ q: "dune" })).toBe("relevance");
    expect(effectiveSort({})).toBe("newest");
    expect(effectiveSort({ q: "dune", sort: "title" })).toBe("title");
  });
});
