import { expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { renderWithProviders } from "@/test/render";
import { accountPage, useAccountPageBounds } from "./pagination";

function Probe({ last, stale = false }: { last: number; stale?: boolean }) {
  useAccountPageBounds({ last_page: last }, stale);
  return <output>{useLocation().search}</output>;
}

it.each([null, "0", "-2", "Infinity", "1.5", "1e2", "9007199254740993"])("rejects invalid page %s before calling an account API", (raw) => {
  expect(accountPage(raw)).toBe(1);
});

it("recovers an empty final page after removal while preserving the customer's filters", async () => {
  renderWithProviders(<Probe last={2} />, { route: "/account/wishlist?page=3&status=reading" });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("?page=2&status=reading"));
});

it("does not clamp to metadata left over from a previous page request", () => {
  renderWithProviders(<Probe last={1} stale />, { route: "/account/orders?page=3" });
  expect(screen.getByRole("status")).toHaveTextContent("?page=3");
});
