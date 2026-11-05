import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { staffApi, type StaffSeriesDetail } from "@/api/endpoints/staff";
import { Toaster } from "@/components/ui/toaster";
import { renderWithProviders } from "@/test/render";
import { SeriesVolumesDialog } from "./SeriesVolumesDialog";

describe("SeriesVolumesDialog (Admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDetail: StaffSeriesDetail = {
    id: 5,
    name: "Attack on Titan",
    slug: "attack-on-titan",
    description: "Manga series",
    has_duplicate_orders: false,
    duplicate_orders: [],
    books: [
      {
        id: 501,
        title: "Attack on Titan Vol 1",
        status: "live",
        series_order: 1,
        cover_image_url: "/covers/aot1.jpg",
        authors: [{ id: 1, name: "Hajime Isayama" }],
        formats: ["paperback"],
        in_stock: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: 502,
        title: "Attack on Titan Vol 2",
        status: "live",
        series_order: 2,
        cover_image_url: "/covers/aot2.jpg",
        authors: [{ id: 1, name: "Hajime Isayama" }],
        formats: ["paperback"],
        in_stock: true,
        created_at: "2026-01-02T00:00:00Z",
      },
    ],
  };

  it("renders series volume books with inline order inputs", async () => {
    vi.spyOn(staffApi, "seriesDetail").mockResolvedValue(mockDetail);

    renderWithProviders(
      <SeriesVolumesDialog seriesId={5} seriesName="Attack on Titan" onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Attack on Titan Vol 1")).toBeInTheDocument();
      expect(screen.getByText("Attack on Titan Vol 2")).toBeInTheDocument();
    });

    const input1 = screen.getByLabelText(/Order for Attack on Titan Vol 1/i) as HTMLInputElement;
    const input2 = screen.getByLabelText(/Order for Attack on Titan Vol 2/i) as HTMLInputElement;
    expect(input1.value).toBe("1");
    expect(input2.value).toBe("2");
  });

  it("warns on duplicate volume numbers and submits updated orders", async () => {
    vi.spyOn(staffApi, "seriesDetail").mockResolvedValue(mockDetail);
    const updateSpy = vi.spyOn(staffApi, "updateSeriesVolumes").mockResolvedValue({
      message: "Volumes updated successfully",
      updated_count: 2,
      has_duplicates: true,
      warnings: ["Multiple volumes share the same volume number."],
    });

    const user = userEvent.setup();
    renderWithProviders(
      <>
        <SeriesVolumesDialog seriesId={5} seriesName="Attack on Titan" onClose={vi.fn()} />
        <Toaster />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText("Attack on Titan Vol 1")).toBeInTheDocument();
    });

    // Change input 2 to order "1" (creating a duplicate)
    const input2 = screen.getByLabelText(/Order for Attack on Titan Vol 2/i);
    await user.clear(input2);
    await user.type(input2, "1");

    // Duplicate warning appears in real time
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Multiple volumes share the same volume number/i)).toBeInTheDocument();
    });

    // Save volume order
    const saveBtn = screen.getByRole("button", { name: /Save volume order/i });
    await user.click(saveBtn);

    expect(updateSpy).toHaveBeenCalledWith(5, {
      volumes: [
        { id: 501, series_order: 1 },
        { id: 502, series_order: 1 },
      ],
    });
  });
});
