/*
 * Google Maps for "pick your delivery spot" (owner 2026-11-04, kept free): the Maps JavaScript API is loaded only when
 * a customer opens the picker, never on page load, so map loads stay far below Google's free monthly amount. The key
 * (VITE_GOOGLE_MAPS_KEY) is a public browser key, locked to the shop's address in Google Cloud. Without it the shop
 * shows no map buttons at all.
 */

export const mapsKey = () => (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined) ?? "";
export const mapsEnabled = () => mapsKey() !== "";

/** Phnom Penh: where the picker opens when the address has no pin yet. */
export const PHNOM_PENH = { lat: 11.5564, lng: 104.9282 };

/** The area the API accepts (customer_addresses pin rule): Cambodia with a small margin. */
export const PIN_AREA = { south: 9.5, north: 15, west: 102, east: 108 };

export type LatLng = { lat: number; lng: number };

/** Minimal shape of what the picker uses from google.maps (the full types are a large package we don't need). */
export interface GoogleMapsApi {
  Map: new (
    el: HTMLElement,
    options: Record<string, unknown>,
  ) => {
    getCenter(): { lat(): number; lng(): number } | undefined;
    setCenter(c: LatLng): void;
    setZoom(z: number): void;
    addListener(event: string, fn: () => void): { remove(): void };
  };
}

declare global {
  interface Window {
    __booklyMapsReady?: () => void;
  }
}

/** window.google is also Google sign-in's (features/auth/social.ts); the maps part is read through this. */
const mapsOnWindow = () => (window as unknown as { google?: { maps?: GoogleMapsApi } }).google?.maps;

let loading: Promise<GoogleMapsApi> | null = null;

export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  const ready = mapsOnWindow();
  if (ready?.Map) return Promise.resolve(ready);
  if (loading) return loading;
  loading = new Promise<GoogleMapsApi>((resolve, reject) => {
    window.__booklyMapsReady = () => {
      const maps = mapsOnWindow();
      if (maps?.Map) resolve(maps);
      else reject(new Error("maps_failed"));
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({ key: mapsKey(), v: "weekly", loading: "async", callback: "__booklyMapsReady", region: "KH" });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("maps_failed"));
    };
    document.head.append(script);
  });
  return loading;
}

/** A plain Google Maps link: free to open (no API key, no usage). */
export const mapsLink = ({ lat, lng }: LatLng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** For tests: forget the loaded script. */
export function resetGoogleMapsForTests() {
  loading = null;
  const w = window as unknown as { google?: { maps?: unknown } };
  if (w.google) delete w.google.maps;
  delete window.__booklyMapsReady;
}
