import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { cartApi } from "@/api/endpoints/cart";
import { catalogApi } from "@/api/endpoints/catalog";
import type { BookDetail, Cart, SeriesBook, SeriesDetail } from "@/api/types";
import { VolumePicker } from "@/components/catalog/VolumePicker";
import { Toaster } from "@/components/ui/toaster";
import { renderWithProviders } from "@/test/render";
import SeriesPage from "./SeriesPage";

describe("Series Volumes & Volume Picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeries: SeriesDetail = {
    id: 10,
    name: "One Piece",
    description: "Epic pirate adventure",
    books: [
      {
        id: 101,
        title: "Volume 1: Romance Dawn",
        series_order: 1,
        in_stock: true,
        is_owned: true,
        is_in_cart: false,
        cover_image_url: "/covers/op1.jpg",
      } as SeriesBook,
      {
        id: 102,
        title: "Volume 2: Buggy the Clown",
        series_order: 2,
        in_stock: true,
        is_owned: false,
        is_in_cart: true,
        cover_image_url: "/covers/op2.jpg",
      } as SeriesBook,
      {
        id: 103,
        title: "Volume 3: Don't Get Fooled Again",
        series_order: 3,
        in_stock: false,
        is_owned: false,
        is_in_cart: false,
        cover_image_url: "/covers/op3.jpg",
      } as SeriesBook,
    ],
  };

  it("renders volume picker with status badges and current highlight", async () => {
    vi.spyOn(catalogApi, "nextVolume").mockResolvedValue({
      id: 102,
      title: "Volume 2: Buggy the Clown",
      series_order: 2,
      cover_image_url: "/covers/op2.jpg",
    } as BookDetail);

    renderWithProviders(<VolumePicker currentBookId={101} series={mockSeries} />);

    // Renders series title and volume tags
    expect(screen.getByText("One Piece")).toBeInTheDocument();
    expect(screen.getByText("Vol. 1")).toBeInTheDocument();
    expect(screen.getByText("Vol. 2")).toBeInTheDocument();
    expect(screen.getByText("Vol. 3")).toBeInTheDocument();

    // Badges
    expect(screen.getByText("Owned")).toBeInTheDocument();
    expect(screen.getByText("In cart")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();

    // Next volume prompt
    await waitFor(() => {
      expect(screen.getByText("Next in series")).toBeInTheDocument();
    });
  });

  it("allows completing the set via Complete the set button", async () => {
    vi.spyOn(catalogApi, "nextVolume").mockResolvedValue(null);
    const addSeriesSpy = vi.spyOn(cartApi, "addSeries").mockResolvedValue({
      added: [
        {
          book_id: 103,
          title: "Volume 3",
          variant_id: 301,
          format: "paperback",
          price_usd: "9.99",
        },
      ],
      skipped: [
        { book_id: 101, title: "Volume 1", reason: "already_owned" },
        { book_id: 102, title: "Volume 2", reason: "already_in_cart" },
      ],
      cart: {} as Cart,
    });

    const user = userEvent.setup();
    renderWithProviders(
      <>
        <VolumePicker currentBookId={101} series={mockSeries} />
        <Toaster />
      </>
    );

    const completeBtn = screen.getByRole("button", { name: /Complete the set/i });
    expect(completeBtn).toBeInTheDocument();
    await user.click(completeBtn);

    expect(addSeriesSpy).toHaveBeenCalledWith(10);
  });

  it("renders Complete the set on SeriesPage and adds missing volumes", async () => {
    vi.spyOn(catalogApi, "series").mockResolvedValue(mockSeries);
    const addSeriesSpy = vi.spyOn(cartApi, "addSeries").mockResolvedValue({
      added: [],
      skipped: [{ book_id: 101, title: "Volume 1", reason: "already_owned" }],
      cart: {} as Cart,
    });

    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/series/:id" element={<SeriesPage />} />
      </Routes>,
      { route: "/series/10" }
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "One Piece" })).toBeInTheDocument();
    });

    const completeBtn = screen.getByRole("button", { name: /Complete the set/i });
    expect(completeBtn).toBeInTheDocument();
    await user.click(completeBtn);

    expect(addSeriesSpy).toHaveBeenCalledWith(10);
  });
});
