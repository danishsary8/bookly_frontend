import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ebookApi, type EbookPreviewMeta, type EbookReaderMeta } from "@/api/endpoints/ebooks";
import { ApiError } from "@/api/errors";
import { renderWithProviders } from "@/test/render";
import ReaderPage from "./ReaderPage";

describe("ReaderPage", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    }) as never;

    class MockImage {
      onload: () => void = () => {};
      width = 800;
      height = 1200;
      set src(_val: string) {
        setTimeout(() => this.onload(), 0);
      }
    }
    vi.stubGlobal("Image", MockImage);

    // Mock URL.createObjectURL and revokeObjectURL
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock-page-url"),
      revokeObjectURL: vi.fn(),
    });

    vi.spyOn(ebookApi, "fetchPageBlobUrl").mockResolvedValue("blob:mock-page-url");
    vi.spyOn(ebookApi, "fetchPreviewPageBlobUrl").mockResolvedValue("blob:mock-preview-url");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const renderReader = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/read/:bookId" element={<ReaderPage />} />
        <Route path="/read/:bookId/preview" element={<ReaderPage />} />
      </Routes>,
      { route },
    );

  it("renders preview mode with preview limits and header", async () => {
    const previewMeta: EbookPreviewMeta = {
      book_id: 10,
      title: "The Great Gatsby",
      page_count: 100,
      preview_pages: 10,
    };
    vi.spyOn(ebookApi, "previewMeta").mockResolvedValue(previewMeta);
    vi.spyOn(ebookApi, "fetchPreviewPageBlobUrl").mockResolvedValue("blob:mock-preview-url");

    renderReader("/read/10/preview");

    expect(await screen.findByText("The Great Gatsby")).toBeInTheDocument();
    expect(screen.getByText(/Free preview/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 10/i)).toBeInTheDocument();
  });

  it("renders reader for owned book and navigates pages", async () => {
    const user = userEvent.setup();
    const meta: EbookReaderMeta = {
      book_id: 10,
      title: "The Great Gatsby",
      status: "ready",
      page_count: 50,
      preview_pages: 5,
      owned: true,
      last_page: 3,
    };
    vi.spyOn(ebookApi, "meta").mockResolvedValue(meta);
    vi.spyOn(ebookApi, "fetchPageBlobUrl").mockResolvedValue("blob:mock-page-3");
    const saveProgress = vi.spyOn(ebookApi, "saveProgress").mockResolvedValue({ page: 4 });

    renderReader("/read/10");

    expect(await screen.findByText("The Great Gatsby")).toBeInTheDocument();
    // Starts at last_page = 3
    expect(screen.getByText(/3 \/ 50/i)).toBeInTheDocument();

    // Click next page
    const nextBtn = screen.getAllByRole("button", { name: /Next page/i })[0];
    await user.click(nextBtn);

    expect(screen.getByText(/4 \/ 50/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(saveProgress).toHaveBeenCalledWith(10, 4);
    });
  });

  it("shows friendly state when book is not owned (403)", async () => {
    vi.spyOn(ebookApi, "meta").mockRejectedValue(
      new ApiError({ kind: "forbidden", status: 403, message: "You have not purchased this ebook." }),
    );

    renderReader("/read/10");

    expect(await screen.findByText(/You don't own this ebook yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read free preview/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buy ebook/i })).toBeInTheDocument();
  });

  it("shows friendly state on device limit (409)", async () => {
    vi.spyOn(ebookApi, "meta").mockRejectedValue(
      new ApiError({ kind: "conflict", status: 409, message: "Device limit reached (max 3 devices)" }),
    );

    renderReader("/read/10");

    expect(await screen.findByText(/Device limit reached/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage devices/i })).toBeInTheDocument();
  });

  it("shows friendly state when ebook is still processing", async () => {
    const meta: EbookReaderMeta = {
      book_id: 10,
      title: "The Great Gatsby",
      status: "processing",
      page_count: 0,
      preview_pages: 0,
      owned: true,
      last_page: null,
    };
    vi.spyOn(ebookApi, "meta").mockResolvedValue(meta);

    renderReader("/read/10");

    expect(await screen.findByText(/Ebook is being prepared/i)).toBeInTheDocument();
  });
});
