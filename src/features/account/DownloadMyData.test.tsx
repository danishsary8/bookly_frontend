import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { Toaster } from "@/components/ui/toaster";
import { dismissToast } from "@/stores/toast";
import { renderWithProviders } from "@/test/render";
import { DownloadMyData } from "./DownloadMyData";

const ui = () =>
  renderWithProviders(
    <>
      <DownloadMyData />
      <Toaster />
    </>,
  );

describe("DownloadMyData", () => {
  let clicked: string[];

  beforeEach(() => {
    clicked = [];
    URL.createObjectURL = vi.fn(() => "blob:bookly-export");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    dismissToast();
  });

  it("downloads the account data as a dated JSON file", async () => {
    const user = userEvent.setup();
    const exportData = vi.spyOn(accountApi, "exportData").mockResolvedValue({ profile: { email: "dara@example.com" } });
    ui();
    await user.click(screen.getByRole("button", { name: "Download my data" }));
    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(exportData).toHaveBeenCalledOnce();
    expect(clicked[0]).toMatch(/^bookly-my-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(await screen.findByText("Your data file is downloading.")).toBeInTheDocument();
  });

  it("says the download isn't available yet when the server doesn't offer it", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "exportData").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    ui();
    await user.click(screen.getByRole("button", { name: "Download my data" }));
    expect(await screen.findByText("Data download isn't available yet. Please try again later.")).toBeInTheDocument();
    expect(clicked).toHaveLength(0);
  });

  it("shows the server's message when the hourly limit is reached", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "exportData").mockRejectedValue(new ApiError({ kind: "rate_limited", status: 429, message: "Too many requests. Try again in an hour." }));
    ui();
    await user.click(screen.getByRole("button", { name: "Download my data" }));
    expect(await screen.findByText("Too many requests. Try again in an hour.")).toBeInTheDocument();
  });
});
