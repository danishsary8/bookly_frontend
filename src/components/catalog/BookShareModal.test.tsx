import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { BookShareModal } from "./BookShareModal";

const mockBook = {
  id: 101,
  title: "Building Microservices in Go",
  slug: "building-microservices-in-go",
  cover_image_url: "https://example.com/cover.jpg",
  authors: [{ name: "Sam Newman" }],
};

describe("BookShareModal", () => {
  it("renders modal with book title, author, and social links when open", () => {
    renderWithProviders(
      <BookShareModal
        open={true}
        onOpenChange={vi.fn()}
        book={mockBook}
        url="https://bookly.com/books/101"
      />,
    );

    expect(screen.getByRole("heading", { name: /Share this book/i })).toBeInTheDocument();
    expect(screen.getByText("Building Microservices in Go")).toBeInTheDocument();
    expect(screen.getByText("Sam Newman")).toBeInTheDocument();

    const telegramLink = screen.getByRole("link", { name: /Telegram/i });
    expect(telegramLink).toHaveAttribute("href");
    expect(telegramLink.getAttribute("href")).toContain("t.me/share/url");

    const facebookLink = screen.getByRole("link", { name: /Facebook/i });
    expect(facebookLink).toHaveAttribute("href");
    expect(facebookLink.getAttribute("href")).toContain("facebook.com/sharer/sharer.php");
  });

  it("handles copy link to clipboard", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    renderWithProviders(
      <BookShareModal
        open={true}
        onOpenChange={vi.fn()}
        book={mockBook}
        url="https://bookly.com/books/101"
      />,
    );

    const copyBtn = screen.getByRole("button", { name: /Copy link/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith("https://bookly.com/books/101");
    expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
  });

  it("switches to QR Code tab and renders QR Code view", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <BookShareModal
        open={true}
        onOpenChange={vi.fn()}
        book={mockBook}
        url="https://bookly.com/books/101"
      />,
    );

    const qrTab = screen.getByRole("tab", { name: /QR Code/i });
    await user.click(qrTab);

    expect(
      screen.getByText(/Scan this QR code with any phone camera to view this book instantly on mobile/i),
    ).toBeInTheDocument();

    // QR code SVG generates asynchronously
    await waitFor(
      () => {
        expect(screen.getByRole("img", { name: "QR Code" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Download QR/i })).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("does not render contents when open is false", () => {
    renderWithProviders(
      <BookShareModal
        open={false}
        onOpenChange={vi.fn()}
        book={mockBook}
        url="https://bookly.com/books/101"
      />,
    );

    expect(screen.queryByRole("heading", { name: /Share this book/i })).not.toBeInTheDocument();
  });
});
