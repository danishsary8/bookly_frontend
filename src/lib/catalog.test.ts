import { describe, expect, it } from "vitest";
import { activeFilterCount, clearFilters, customSort, effectiveSort, isbnDigits, parseBookFilters, suggestSpelling, toSearchParams, withFilter } from "./catalog";

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

  it("reads and writes the audience filters, dropping bad values", () => {
    const params = new URLSearchParams("age=10&school_grade=9&level=B1&has_ebook=1&sort=best_selling");
    const filters = parseBookFilters(params);
    expect(filters).toMatchObject({ age: 10, school_grade: 9, level: "B1", has_ebook: true, sort: "best_selling" });
    expect(toSearchParams(filters).toString()).toBe("age=10&school_grade=9&level=B1&has_ebook=1&sort=best_selling");
    expect(parseBookFilters(new URLSearchParams("age=40&school_grade=13&level=Z9&has_ebook=yes"))).toMatchObject({ age: undefined, school_grade: undefined, level: undefined, has_ebook: undefined });
    expect(activeFilterCount(filters)).toBe(4);
  });
});

describe("search helpers", () => {
  it("recognises ISBNs typed with or without hyphens", () => {
    expect(isbnDigits("978-0-00-400000-1")).toBe("9780004000001");
    expect(isbnDigits("0 306 40615 2")).toBe("0306406152");
    expect(isbnDigits("030640615x")).toBe("030640615X");
    expect(isbnDigits("12345")).toBeNull();
    expect(isbnDigits("harry potter")).toBeNull();
    expect(isbnDigits(undefined)).toBeNull();
  });

  it("suggests the closest spelling from the books that came back", () => {
    const texts = ["Mistborn: The Final Empire", "Brandon Sanderson"];
    expect(suggestSpelling("mistbron", texts)).toBe("mistborn");
    expect(suggestSpelling("brandon sandersen", texts)).toBe("brandon sanderson");
    expect(suggestSpelling("mistborn", texts)).toBeNull();
    expect(suggestSpelling("qqqqqqqq", texts)).toBeNull();
  });

  it("shows a sort chip only for a sort the visitor chose", () => {
    expect(customSort({})).toBeUndefined();
    expect(customSort({ sort: "newest" })).toBeUndefined();
    expect(customSort({ q: "x", sort: "relevance" })).toBeUndefined();
    expect(customSort({ sort: "best_selling" })).toBe("best_selling");
    expect(customSort({ q: "x", sort: "newest" })).toBe("newest");
  });
});
