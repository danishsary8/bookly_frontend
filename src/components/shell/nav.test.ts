import { describe, expect, it } from "vitest";
import { isActivePath, searchPath } from "./nav";

describe("isActivePath", () => {
  it("matches a section and its children", () => {
    expect(isActivePath("/books", "/books")).toBe(true);
    expect(isActivePath("/books/12", "/books")).toBe(true);
    expect(isActivePath("/booksellers", "/books")).toBe(false);
  });

  it("matches home only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/books", "/")).toBe(false);
  });

  it("never marks query-string shortcuts active", () => {
    expect(isActivePath("/books", "/books?sort=newest")).toBe(false);
  });
});

describe("searchPath", () => {
  it("encodes the trimmed query", () => {
    expect(searchPath("  harry & potter ")).toBe("/search?q=harry%20%26%20potter");
  });
});
