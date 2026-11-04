import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountApi, type CustomerSession } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { renderWithProviders } from "@/test/render";
import { SignedInDevices } from "./SignedInDevices";

const session = (id: number, device: string | null, current = false): CustomerSession => ({
  id,
  device,
  ip_address: `203.0.113.${id}`,
  signed_in_at: "2026-11-01T02:00:00Z",
  last_used_at: "2026-11-04T03:00:00Z",
  expires_at: null,
  is_current: current,
});

afterEach(() => vi.restoreAllMocks());

describe("Where you're signed in", () => {
  it("lists every device with this one first and marked, and signs out another device", async () => {
    const user = userEvent.setup();
    const list = vi.spyOn(accountApi, "sessions").mockResolvedValue([session(2, "Safari on iPhone"), session(1, "Chrome on Windows", true), session(3, null)]);
    const signOut = vi.spyOn(accountApi, "signOutSession").mockResolvedValue({ message: "ok" });
    renderWithProviders(<SignedInDevices />);

    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Chrome on Windows");
    expect(within(items[0]).getByText("This device")).toBeInTheDocument();
    expect(within(items[0]).queryByRole("button")).not.toBeInTheDocument(); // this device: use the normal Sign out
    expect(items[0]).toHaveTextContent("203.0.113.1");
    expect(screen.getByText("Earlier sign-in (device not recorded)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out Safari on iPhone" }));
    expect(signOut).toHaveBeenCalledWith(2);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2)); // the list reloads
  });

  it("signs out all other devices at once, and says when only this one is left", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "sessions")
      .mockResolvedValueOnce([session(1, "Chrome on Windows", true), session(2, "Safari on iPhone")])
      .mockResolvedValue([session(1, "Chrome on Windows", true)]);
    const others = vi.spyOn(accountApi, "signOutOtherSessions").mockResolvedValue({ message: "ok", signed_out: 1 });
    renderWithProviders(<SignedInDevices />);

    await user.click(await screen.findByRole("button", { name: "Sign out of all other devices" }));
    expect(others).toHaveBeenCalled();
    expect(await screen.findByText("Only this device is signed in.")).toBeInTheDocument();
  });

  it("stays hidden while the API doesn't offer the list yet", async () => {
    const list = vi.spyOn(accountApi, "sessions").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    const { container } = renderWithProviders(<SignedInDevices />);
    await waitFor(() => expect(list).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
