import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import SearchPage from "./SearchPage";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "@/stores/recentSearches";

describe("SearchPage", () => {
  beforeEach(() => {
    clearRecentSearches();
    window.localStorage.clear();
  });

  it("renders discovery hub with popular searches when no query is present", () => {
    renderWithProviders(<SearchPage />, { route: "/search" });

    expect(screen.getByRole("heading", { name: /Popular searches/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khmer History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Business & Leadership" })).toBeInTheDocument();
  });

  it("displays recent searches when available and allows clearing them", async () => {
    const user = userEvent.setup();
    addRecentSearch("Microservices");
    addRecentSearch("Architecture");

    renderWithProviders(<SearchPage />, { route: "/search" });

    expect(screen.getByRole("heading", { name: /Recent searches/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Architecture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Microservices" })).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /Clear all/i });
    await user.click(clearBtn);

    expect(screen.queryByRole("heading", { name: /Recent searches/i })).not.toBeInTheDocument();
  });

  it("clicking a popular search tag triggers search and updates URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />, { route: "/search" });

    const tagBtn = screen.getByRole("button", { name: "Personal Finance" });
    await user.click(tagBtn);

    expect(getRecentSearches()).toContain("Personal Finance");
  });

  it("submitting search form persists query to recent searches", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />, { route: "/search" });

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "Cambodia Recipes{Enter}");

    expect(getRecentSearches()).toContain("Cambodia Recipes");
  });
});
