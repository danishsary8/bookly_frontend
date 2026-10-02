import { useSyncExternalStore } from "react";

/*
 * USD / KHR display preference. The API sends every price in both currencies (riel is converted on
 * the server with the shop's current exchange rate), so the browser never converts anything itself.
 */

export type Currency = "USD" | "KHR";

const KEY = "bookly.currency";
const listeners = new Set<() => void>();

const read = (): Currency => {
  try {
    return window.localStorage.getItem(KEY) === "KHR" ? "KHR" : "USD";
  } catch {
    return "USD";
  }
};

let current: Currency = typeof window === "undefined" ? "USD" : read();

export const getCurrency = () => current;

export const setCurrency = (currency: Currency) => {
  current = currency;
  try {
    window.localStorage.setItem(KEY, currency);
  } catch {
    // Not stored: the choice lasts until reload.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCurrency = (): Currency => useSyncExternalStore(subscribe, getCurrency, () => "USD");

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const rielFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const toNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export const formatUsd = (value: string | number | null | undefined): string => usdFormat.format(toNumber(value) ?? 0);

export const formatKhr = (value: string | number | null | undefined): string => `${rielFormat.format(toNumber(value) ?? 0)}\u00A0\u17DB`;

/**
 * Formats a price pair from the API in the chosen currency. Riel is null when the shop has no exchange
 * rate yet; then dollars are shown either way.
 */
export const formatMoney = (usd: string | number | null | undefined, khr: string | number | null | undefined, currency: Currency): string =>
  currency === "KHR" && toNumber(khr) !== null ? formatKhr(khr) : formatUsd(usd);
