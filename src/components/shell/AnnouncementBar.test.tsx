import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { setLanguage } from "@/i18n";
import { AnnouncementBar, ANNOUNCEMENT_STORAGE_KEY } from "./AnnouncementBar";

describe("AnnouncementBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLanguage("en");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders promotional delivery message and shop books link by default", () => {
    renderWithProviders(<AnnouncementBar />);

    expect(
      screen.getByText(/Flat \$1\.50 Delivery in Phnom Penh/i),
    ).toBeInTheDocument();

    const shopLink = screen.getByRole("link", { name: /Shop books/i });
    expect(shopLink).toBeInTheDocument();
    expect(shopLink).toHaveAttribute("href", "/books");
  });

  it("dismisses the bar and persists dismissal to localStorage when close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementBar />);

    const dismissButton = screen.getByRole("button", {
      name: "Dismiss announcement",
    });
    expect(dismissButton).toBeInTheDocument();

    await user.click(dismissButton);

    expect(
      screen.queryByText(/Flat \$1\.50 Delivery in Phnom Penh/i),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)).toBe("1");
  });

  it("does not render if previously dismissed in localStorage", () => {
    window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "1");
    renderWithProviders(<AnnouncementBar />);

    expect(
      screen.queryByText(/Flat \$1\.50 Delivery in Phnom Penh/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dismiss announcement" }),
    ).not.toBeInTheDocument();
  });

  it("renders localized Khmer content when language is switched", () => {
    setLanguage("km");
    renderWithProviders(<AnnouncementBar />);

    expect(
      screen.getByText(/តម្លៃដឹកជញ្ជូន 1\.50\$ ក្នុងរាជធានីភ្នំពេញ/i),
    ).toBeInTheDocument();

    const shopLink = screen.getByRole("link", { name: /ទិញសៀវភៅ/i });
    expect(shopLink).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "បិទការជូនដំណឹង" }),
    ).toBeInTheDocument();
  });
});
