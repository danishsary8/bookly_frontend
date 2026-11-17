import { afterEach, describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { setLanguage } from "@/i18n";
import { BookGrid } from "./BookGrid";
import type { BookCard as Book } from "@/api/types";

const sampleBook = (id: number, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  formats: ["paperback"],
  price_from_usd: "12.00",
  price_from_khr: "49200",
  ...extra,
});

describe("BookGrid topic results", () => {
  afterEach(() => {
    act(() => setLanguage("en"));
  });

  it("does not render topic heading when no books have match=meaning", () => {
    const books = [sampleBook(1, "Classic Novel"), sampleBook(2, "Modern Fiction")];
    renderWithProviders(<BookGrid books={books} />);

    expect(screen.getByRole("heading", { name: "Classic Novel" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Modern Fiction" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Books about this topic" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "សៀវភៅអំពីប្រធានបទនេះ" })).not.toBeInTheDocument();
  });

  it("renders 'Books about this topic' heading in English when meaning matches are present", () => {
    const books = [
      sampleBook(1, "Keyword Book"),
      sampleBook(2, "Semantic Topic Book", { match: "meaning" }),
    ];
    renderWithProviders(<BookGrid books={books} />);

    expect(screen.getByRole("heading", { name: "Keyword Book" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Books about this topic" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Semantic Topic Book" })).toBeInTheDocument();
  });

  it("renders 'សៀវភៅអំពីប្រធានបទនេះ' heading in Khmer when language is set to km", () => {
    act(() => setLanguage("km"));

    const books = [
      sampleBook(1, "Keyword Book"),
      sampleBook(2, "Semantic Topic Book", { match: "meaning" }),
    ];
    renderWithProviders(<BookGrid books={books} />);

    expect(screen.getByRole("heading", { name: "Keyword Book" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "សៀវភៅអំពីប្រធានបទនេះ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Semantic Topic Book" })).toBeInTheDocument();
  });

  it("renders topic heading when only semantic topic books are present", () => {
    const books = [
      sampleBook(1, "Topic Book One", { match: "meaning" }),
      sampleBook(2, "Topic Book Two", { match: "meaning" }),
    ];
    renderWithProviders(<BookGrid books={books} />);

    expect(screen.getByRole("heading", { name: "Books about this topic" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Topic Book One" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Topic Book Two" })).toBeInTheDocument();
  });
});
