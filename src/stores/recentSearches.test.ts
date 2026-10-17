import { beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  RECENT_SEARCHES_LIMIT,
  removeRecentSearch,
} from "./recentSearches";

describe("recentSearches store", () => {
  beforeEach(() => {
    clearRecentSearches();
    window.localStorage.clear();
  });

  it("starts empty", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("adds searches, newest first, and deduplicates case-insensitively", () => {
    addRecentSearch("Khmer History");
    addRecentSearch("Golang");
    addRecentSearch("khmer history"); // duplicate with different case

    const searches = getRecentSearches();
    expect(searches).toHaveLength(2);
    expect(searches[0]).toBe("khmer history"); // moved to front
    expect(searches[1]).toBe("Golang");
  });

  it("limits to RECENT_SEARCHES_LIMIT items", () => {
    for (let i = 1; i <= RECENT_SEARCHES_LIMIT + 5; i++) {
      addRecentSearch(`Query ${i}`);
    }

    const searches = getRecentSearches();
    expect(searches).toHaveLength(RECENT_SEARCHES_LIMIT);
    expect(searches[0]).toBe(`Query ${RECENT_SEARCHES_LIMIT + 5}`);
  });

  it("removes a specific search", () => {
    addRecentSearch("Book A");
    addRecentSearch("Book B");
    removeRecentSearch("book a");

    expect(getRecentSearches()).toEqual(["Book B"]);
  });

  it("clears all searches", () => {
    addRecentSearch("Book A");
    addRecentSearch("Book B");
    clearRecentSearches();

    expect(getRecentSearches()).toEqual([]);
  });
});
