import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import type { BookDetail, BookVariant } from "@/api/types";
import { renderWithProviders } from "@/test/render";
import { FormatPicker } from "@/components/catalog/FormatPicker";
import BookDetailPage from "./BookDetailPage";

describe("Pre-order and Back-order Frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pre-order and back-order labels in FormatPicker", () => {
    const variants: BookVariant[] = [
      {
        id: 1,
        format: "hardcover",
        price_usd: "25.00",
        price_khr: "102500",
        in_stock: true,
        is_preorder: true,
        release_date: "2026-11-28",
      },
      {
        id: 2,
        format: "paperback",
        price_usd: "15.00",
        price_khr: "61500",
        in_stock: true,
        is_backorder: true,
      },
      {
        id: 3,
        format: "ebook",
        price_usd: "9.99",
        price_khr: "40959",
        in_stock: true,
      },
    ];

    renderWithProviders(<FormatPicker variants={variants} value={1} onChange={() => {}} name="format" />);

    expect(screen.getByText("Pre-order")).toBeInTheDocument();
    expect(screen.getByText("Back-order")).toBeInTheDocument();
    expect(screen.getByText("Instant download")).toBeInTheDocument();
  });

  it("renders pre-order button and release date notice on BookDetailPage", async () => {
    const mockBook: BookDetail = {
      id: 10,
      title: "Upcoming Masterpiece",
      authors: [{ id: 1, name: "Haruki Murakami" }],
      price_from_usd: "28.00",
      price_from_khr: "114800",
      formats: ["hardcover"],
      in_stock: true,
      rating_avg: null,
      review_count: 0,
      variants: [
        {
          id: 101,
          format: "hardcover",
          price_usd: "28.00",
          price_khr: "114800",
          in_stock: true,
          is_preorder: true,
          release_date: "2026-12-15",
        },
      ],
    };

    vi.spyOn(catalogApi, "book").mockResolvedValue(mockBook);
    vi.spyOn(catalogApi, "related").mockResolvedValue([]);

    renderWithProviders(
      <Routes>
        <Route path="/books/:id" element={<BookDetailPage />} />
      </Routes>,
      { route: "/books/10" },
    );

    // Pre-order CTA and notice
    expect(await screen.findByRole("button", { name: /pre-order now/i })).toBeInTheDocument();
    expect(screen.getByText(/ships from 2026-12-15/i)).toBeInTheDocument();
  });

  it("renders back-order button and ships in about 2-3 weeks notice on BookDetailPage", async () => {
    const mockBook: BookDetail = {
      id: 20,
      title: "Popular Sold Out Manga",
      authors: [{ id: 2, name: "Eiichiro Oda" }],
      price_from_usd: "12.00",
      price_from_khr: "49200",
      formats: ["paperback"],
      in_stock: true,
      rating_avg: null,
      review_count: 0,
      variants: [
        {
          id: 201,
          format: "paperback",
          price_usd: "12.00",
          price_khr: "49200",
          in_stock: true,
          is_backorder: true,
        },
      ],
    };

    vi.spyOn(catalogApi, "book").mockResolvedValue(mockBook);
    vi.spyOn(catalogApi, "related").mockResolvedValue([]);

    renderWithProviders(
      <Routes>
        <Route path="/books/:id" element={<BookDetailPage />} />
      </Routes>,
      { route: "/books/20" },
    );

    // Back-order CTA and notice
    expect(await screen.findByRole("button", { name: /order now/i })).toBeInTheDocument();
    expect(screen.getByText(/ships in about 2–3 weeks/i)).toBeInTheDocument();
  });
});
