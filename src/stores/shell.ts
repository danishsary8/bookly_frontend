import { useSyncExternalStore } from "react";

/*
 * Which shell overlay is open. A store rather than component state so that
 * anything can open the cart drawer (e.g. "Add to cart" on a book card), and
 * opening one overlay closes the other.
 */

export type ShellPanel = "cart" | "menu" | null;

const listeners = new Set<() => void>();
let panel: ShellPanel = null;

export const getShellPanel = () => panel;

export const openShellPanel = (next: ShellPanel) => {
  if (panel === next) return;
  panel = next;
  listeners.forEach((listener) => listener());
};

export const closeShellPanel = () => openShellPanel(null);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useShellPanel = () => useSyncExternalStore(subscribe, getShellPanel, () => null);
