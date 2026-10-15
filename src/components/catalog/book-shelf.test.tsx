import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { BookShelf } from "./BookShelf";

describe("BookShelf", () => {
  it("names its 'see all' link even when the page gives no label (axe: links need text)", () => {
    renderWithProviders(<BookShelf id="new" title="New arrivals" books={[]} loading seeAllHref="/books?sort=newest" />);
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/books?sort=newest");
  });
});
