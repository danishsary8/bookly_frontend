import { useSyncExternalStore } from "react";

/*
 * Toast queue (MASTER §6.5). Call `toast.success(...)` from anywhere — event
 * handlers, mutation callbacks — and <Toaster /> in the app shell renders it.
 * At most 3 are shown, newest on top; errors stay until dismissed.
 */

export type ToastTone = "success" | "error" | "info";

export type ToastAction = { label: string; href?: string; onClick?: () => void };

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Milliseconds before auto-dismiss; null keeps it until closed. */
  duration: number | null;
};

type ToastInput = Omit<Toast, "id" | "tone" | "duration"> & { duration?: number | null };

export const MAX_TOASTS = 3;
export const DEFAULT_DURATION = 5000;

const listeners = new Set<() => void>();
let toasts: Toast[] = [];
let nextId = 1;

const emit = () => listeners.forEach((listener) => listener());

const push = (tone: ToastTone, input: ToastInput | string) => {
  const data = typeof input === "string" ? { title: input } : input;
  const id = nextId++;
  const duration = data.duration !== undefined ? data.duration : tone === "error" ? null : DEFAULT_DURATION;
  toasts = [{ ...data, id, tone, duration }, ...toasts].slice(0, MAX_TOASTS);
  emit();
  return id;
};

export const dismissToast = (id?: number) => {
  toasts = id === undefined ? [] : toasts.filter((t) => t.id !== id);
  emit();
};

export const toast = {
  success: (input: ToastInput | string) => push("success", input),
  error: (input: ToastInput | string) => push("error", input),
  info: (input: ToastInput | string) => push("info", input),
  dismiss: dismissToast,
};

export const getToasts = () => toasts;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useToasts = () => useSyncExternalStore(subscribe, getToasts, getToasts);
