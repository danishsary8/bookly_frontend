import { afterEach, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { ApiError } from "@/api/errors";
import { renderWithProviders } from "@/test/render";
import NewsletterAdminPage from "./NewsletterAdminPage";

afterEach(() => vi.restoreAllMocks());

it("reports failed subscriber and campaign requests and lets staff retry each independently", async () => {
  const user = userEvent.setup();
  const summary = vi.spyOn(newsletterApi, "getSummary")
    .mockRejectedValueOnce(new ApiError({ kind: "server", message: "Subscriber totals unavailable." }))
    .mockResolvedValue({ confirmed: 12, pending: 2, unsubscribed: 1, total: 15, daily_limit: 60 });
  const campaigns = vi.spyOn(newsletterApi, "listCampaigns")
    .mockRejectedValueOnce(new ApiError({ kind: "server", message: "Campaign list unavailable." }))
    .mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
  renderWithProviders(<NewsletterAdminPage />, { route: "/admin/newsletter" });

  const totalsError = await screen.findByText("Subscriber totals unavailable.");
  const campaignsError = await screen.findByText("Campaign list unavailable.");
  expect(screen.queryByText(/No newsletter campaigns created yet/)).not.toBeInTheDocument();
  expect(screen.queryByText("Confirmed subscribers")).not.toBeInTheDocument();
  await user.click(within(totalsError.closest('[role="alert"]') as HTMLElement).getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("12")).toBeInTheDocument();
  expect(screen.getByText("Campaign list unavailable.")).toBeInTheDocument();
  await user.click(within(campaignsError.closest('[role="alert"]') as HTMLElement).getByRole("button", { name: "Try again" }));
  expect(await screen.findByText(/No newsletter campaigns created yet/)).toBeInTheDocument();
  expect(summary).toHaveBeenCalledTimes(2);
  expect(campaigns).toHaveBeenCalledTimes(2);
});
