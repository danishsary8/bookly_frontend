import { beforeEach, describe, expect, it } from "vitest";
import { RECENT_LIMIT, addRecentlyViewed, clearRecentlyViewed, getRecentlyViewed } from "./recentlyViewed";

beforeEach(() => clearRecentlyViewed());

describe("recently viewed", () => {
  it("keeps the newest first without duplicates", () => {
    addRecentlyViewed({ id: 1, title: "Dune" });
    addRecentlyViewed({ id: 2, title: "Emma" });
    addRecentlyViewed({ id: 1, title: "Dune" });
    expect(getRecentlyViewed().map((b) => b.id)).toEqual([1, 2]);
  });

  it("stores only card fields and caps the list", () => {
    for (let id = 1; id <= RECENT_LIMIT + 3; id++) addRecentlyViewed({ id, title: `Book ${id}`, description: "long text" } as never);
    const books = getRecentlyViewed();
    expect(books).toHaveLength(RECENT_LIMIT);
    expect(books[0].id).toBe(RECENT_LIMIT + 3);
    expect(books[0]).not.toHaveProperty("description");
  });

  it("ignores corrupt storage", () => {
    localStorage.setItem("bookly.recentlyViewed", "{not json");
    expect(getRecentlyViewed()).toEqual([]);
  });
});
