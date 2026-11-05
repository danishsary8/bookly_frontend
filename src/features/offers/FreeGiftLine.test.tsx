import { afterEach, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { setLanguage } from "@/i18n";
import { FreeGiftLine } from "./FreeGiftLine";

const gift = { name_en: "Highlighter pen", name_km: "ប៊ិចរំលេច", quantity: 1, limited: true };
afterEach(() => act(() => setLanguage("en")));

it("shows gift quantity and a real limited signal", () => {
  renderWithProviders(<FreeGiftLine gift={gift} />);
  expect(screen.getByText("Free gift: Highlighter pen ×1")).toBeInTheDocument();
  expect(screen.getByText("Limited")).toBeInTheDocument();
});

it("prints a packing instruction without prices or marketing", () => {
  renderWithProviders(<FreeGiftLine gift={gift} packing />);
  expect(screen.getByText("Include: Highlighter pen ×1")).toBeInTheDocument();
  expect(screen.queryByText("Limited")).not.toBeInTheDocument();
});

it("uses the Khmer snapshot name", () => {
  act(() => setLanguage("km"));
  renderWithProviders(<FreeGiftLine gift={gift} />);
  expect(screen.getByText("កាដូឥតគិតថ្លៃ៖ ប៊ិចរំលេច ×1")).toBeInTheDocument();
});
