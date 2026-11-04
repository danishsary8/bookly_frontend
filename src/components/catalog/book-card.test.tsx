import { afterEach, describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { setLanguage } from "@/i18n";
import { BookCard } from "./BookCard";
import type { BookCard as Book } from "@/api/types";

const sampleBook = (extra: Partial<Book> = {}): Book => ({
  id: 1,
  title: "Test Book",
  formats: ["paperback"],
  price_from_usd: "12.00",
  price_from_khr: "49200",
  ...extra,
});

describe("BookCard audience tag", () => {
  afterEach(() => {
    act(() => setLanguage("en"));
  });

  it("renders quiet tag for level when level is set", () => {
    renderWithProviders(<BookCard book={sampleBook({ level: "B1" })} />);
    expect(screen.getByText("B1")).toBeInTheDocument();
  });

  it("renders quiet tag for school grade when grade is set", () => {
    renderWithProviders(<BookCard book={sampleBook({ school_grade: 9 })} />);
    expect(screen.getByText("Grade 9")).toBeInTheDocument();
  });

  it("renders level when both level and school grade are set", () => {
    renderWithProviders(<BookCard book={sampleBook({ level: "B2", school_grade: 11 })} />);
    expect(screen.getByText("B2")).toBeInTheDocument();
  });

  it("renders Khmer grade label when language is set to km", () => {
    act(() => setLanguage("km"));
    renderWithProviders(<BookCard book={sampleBook({ school_grade: 12 })} />);
    expect(screen.getByText("ថ្នាក់ទី 12")).toBeInTheDocument();
  });
});
