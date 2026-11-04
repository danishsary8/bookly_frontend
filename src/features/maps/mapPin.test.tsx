import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "@/api/endpoints/account";
import type { Address, Order } from "@/api/types";
import { AddressForm } from "@/features/account/AddressForm";
import { DeliveryAddressCard } from "@/features/orders/OrderSummary";
import { renderWithProviders } from "@/test/render";
import { resetGoogleMapsForTests } from "./googleMaps";

/** A stand-in for google.maps: the map "sits" at whatever center it was given (or moved to). */
function fakeGoogleMaps(moveTo?: { lat: number; lng: number }) {
  const made: Array<{ options: Record<string, unknown> }> = [];
  class FakeMap {
    private c: { lat: number; lng: number };
    constructor(_el: HTMLElement, options: Record<string, unknown>) {
      made.push({ options });
      this.c = moveTo ?? (options.center as { lat: number; lng: number });
    }
    getCenter() {
      return { lat: () => this.c.lat, lng: () => this.c.lng };
    }
    setCenter(c: { lat: number; lng: number }) {
      this.c = c;
    }
    setZoom() {}
    addListener(_e: string, fn: () => void) {
      setTimeout(fn, 0);
      return { remove() {} };
    }
  }
  (window as unknown as { google: unknown }).google = { maps: { Map: FakeMap } };
  return made;
}

const address: Address = { id: 7, recipient_name: "Dara", phone: "012345678", address_line1: "Street 240", city: "Phnom Penh", country: "Cambodia", is_default: true };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetGoogleMapsForTests();
});

describe("delivery spot on the map", () => {
  it("shows no map buttons while the shop has no Google Maps key", () => {
    renderWithProviders(<AddressForm onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Pick on map/ })).not.toBeInTheDocument();
  });

  it("lets the customer pin a spot inside Cambodia and saves it with the address", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_KEY", "browser-key");
    const made = fakeGoogleMaps({ lat: 11.567, lng: 104.89 });
    const create = vi.spyOn(accountApi, "createAddress").mockImplementation(async (input) => ({ ...address, ...input }) as Address);
    const user = userEvent.setup();
    renderWithProviders(<AddressForm onSaved={vi.fn()} defaults={{ recipient_name: "Dara", phone: "012345678" }} />);

    await user.type(screen.getByLabelText(/Street/), "Street 240");
    await user.type(screen.getByLabelText(/^City/), "Phnom Penh");
    await user.click(screen.getByRole("button", { name: "Pick on map" }));
    expect(await screen.findByRole("dialog", { name: "Pick your delivery spot" })).toBeInTheDocument();
    expect(await screen.findByText("11.567, 104.89")).toBeInTheDocument();
    expect(made[0].options.restriction).toEqual({ latLngBounds: { south: 9.5, north: 15, west: 102, east: 108 }, strictBounds: false });
    await user.click(screen.getByRole("button", { name: "Use this spot" }));

    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=11.567,104.89");
    await user.click(screen.getByRole("button", { name: /Add address|Save/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ latitude: 11.567, longitude: 104.89 })));
  });

  it("removing the pin of a saved address sends null; a new address without a pin sends nothing", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_KEY", "browser-key");
    const update = vi.spyOn(accountApi, "updateAddress").mockImplementation(async (_id, input) => ({ ...address, ...input }) as Address);
    const user = userEvent.setup();
    renderWithProviders(<AddressForm address={{ ...address, latitude: 11.5, longitude: 104.9 }} onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Remove pin" }));
    await user.click(screen.getByRole("button", { name: /Save/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ latitude: null, longitude: null })));
  });

  it("says so when the map can't load, and the address can still be saved", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_KEY", "browser-key");
    const user = userEvent.setup();
    renderWithProviders(<AddressForm onSaved={vi.fn()} />);
    const appended = vi.spyOn(document.head, "append").mockImplementation((node) => {
      setTimeout(() => (node as HTMLScriptElement).onerror?.(new Event("error")), 0);
    });

    await user.click(screen.getByRole("button", { name: "Pick on map" }));
    expect(await screen.findByText(/The map couldn't load/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use this spot" })).toBeDisabled();
    expect(appended).toHaveBeenCalled();
    const script = appended.mock.calls[0][0] as HTMLScriptElement;
    expect(script.src).toMatch(/^https:\/\/maps\.googleapis\.com\/maps\/api\/js\?key=browser-key&/);
  });

  it("gives the courier an Open in Google Maps link on the order (no key needed)", () => {
    const shipping = { ...address, latitude: 11.556374, longitude: 104.928207 } as Order["shipping_address"];
    renderWithProviders(<DeliveryAddressCard address={shipping} />);
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=11.556374,104.928207");
  });
});
