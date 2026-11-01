import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { collectionsApi, type SeasonalCollection } from "@/api/endpoints/collections";
import { ApiError } from "@/api/errors";
import type { BookCard } from "@/api/types";
import { setLanguage } from "@/i18n";
import { renderWithProviders } from "@/test/render";
import HomePage from "@/pages/HomePage";
import CollectionPage from "./CollectionPage";

/* Seasonal collections in the shop (owner 2026-11-01): home row(s) and /collections/:slug. */

const book = (id: number, title: string): BookCard => ({ id, title, authors: [], formats: ["paperback"], in_stock: true, price_from_usd: "10.00", price_from_khr: null, rating_avg: null, review_count: 0 });
const rain: SeasonalCollection = {
  id: 1, slug: "rainy-season-reads", title_en: "Rainy season reads", title_km: "សៀវភៅរដូវវស្សា", description_en: "Cosy books for wet afternoons.",
  description_km: null, ends_at: "2026-11-30T16:59:59Z", books_count: 2, books: [book(5, "The Sign of the Four"), book(1, "Pride and Prejudice")],
};
const exam: SeasonalCollection = { ...rain, id: 2, slug: "exam-season", title_en: "Exam season", title_km: null, books: [book(9, "The Art of War")] };
const empty = { data: [], links: {}, meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null } } as never;

const app = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/collections/:slug" element={<CollectionPage />} />
    </Routes>,
    { route },
  );

const quietHome = () => {
  vi.spyOn(catalogApi, "books").mockResolvedValue(empty);
  vi.spyOn(catalogApi, "categories").mockResolvedValue([]);
};

afterEach(() => {
  vi.restoreAllMocks();
  setLanguage("en");
});

describe("seasonal collections", () => {
  it("shows each live collection as a home row with a See all link, in order", async () => {
    quietHome();
    vi.spyOn(collectionsApi, "live").mockResolvedValue([rain, exam]);
    app("/");
    const row = await screen.findByRole("region", { name: "Rainy season reads" });
    expect(within(row).getByRole("heading", { name: "The Sign of the Four" })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/collections/rainy-season-reads");
    const second = screen.getByRole("region", { name: "Exam season" });
    expect(row.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // the API's order
  });

  it("uses the Khmer title, and falls back to English when there is none", async () => {
    setLanguage("km");
    quietHome();
    vi.spyOn(collectionsApi, "live").mockResolvedValue([rain, exam]);
    app("/");
    expect(await screen.findByRole("region", { name: "សៀវភៅរដូវវស្សា" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Exam season" })).toBeInTheDocument();
  });

  it("shows no row when the API has no collections (404)", async () => {
    quietHome();
    vi.spyOn(collectionsApi, "live").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app("/");
    await screen.findByRole("region", { name: /New arrivals/ });
    expect(screen.queryByText("Seasonal pick")).not.toBeInTheDocument();
  });

  it("collection page: title, description, end date and its books", async () => {
    vi.spyOn(collectionsApi, "bySlug").mockResolvedValue(rain);
    app("/collections/rainy-season-reads");
    expect(await screen.findByRole("heading", { level: 1, name: "Rainy season reads" })).toBeInTheDocument();
    expect(screen.getByText(/Cosy books for wet afternoons\. · Until 30 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText("Seasonal pick · 2 books")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "The Sign of the Four" })).toBeInTheDocument();
  });

  it("collection page says not found for a hidden or unknown collection", async () => {
    vi.spyOn(collectionsApi, "bySlug").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app("/collections/old-one");
    expect(await screen.findByRole("link", { name: "All books" })).toHaveAttribute("href", "/books");
  });
});
