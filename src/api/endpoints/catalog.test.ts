import { describe, expect, it } from "vitest";
import { toQueryParams } from "./catalog";

describe("toQueryParams", () => {
  it("drops empty filters and sends booleans as 1", () => {
    expect(toQueryParams({ q: "holmes", in_stock: true, format: undefined, language: "", page: 2, category_id: null, sort: "newest" })).toEqual({
      q: "holmes",
      in_stock: 1,
      page: 2,
      sort: "newest",
    });
  });

  it("omits false so the API does not filter on it", () => {
    expect(toQueryParams({ in_stock: false })).toEqual({});
  });
});
