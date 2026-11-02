import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { orderQueries, CUSTOMER_REFRESH_MS } from "@/api/endpoints/orders";
import { AUTO_REFRESH_MS, refreshAdminData, resetAutoRefreshForTests, useAdminAutoRefresh, usePauseAutoRefresh } from "./autoRefresh";
import { RefreshNote } from "./RefreshNote";

/* Auto refresh (owner 2026-11-02: "Admin + customer orders"). */

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
  const calls: Record<string, number> = {};
  const watch = (key: readonly unknown[]) => {
    const name = key.join("/");
    calls[name] = 0;
    const observer = new QueryObserver(client, { queryKey: key, queryFn: async () => ++calls[name] });
    return observer.subscribe(() => {});
  };
  return { client, calls, watch };
}
const flush = () => act(async () => {
  await new Promise((r) => setTimeout(r, 0));
});

beforeEach(() => resetAutoRefreshForTests());
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("admin auto refresh", () => {
  it("refreshes admin data on screen, not the shop catalogue or search boxes", async () => {
    const { client, calls, watch } = setup();
    watch(["staff", "orders", { page: 1 }]);
    watch(["staff", "jump", "orders", "ab"]);
    watch(["catalog", "books"]);
    watch(["catalog", "admin-lookup", "authors"]);
    await flush();
    await act(() => refreshAdminData(client));
    expect(calls["staff/orders/[object Object]"]).toBe(2);
    expect(calls["catalog/admin-lookup/authors"]).toBe(2);
    expect(calls["staff/jump/orders/ab"]).toBe(1);
    expect(calls["catalog/books"]).toBe(1);
  });

  it("waits while a dialog is open or someone is typing; Refresh now still works", async () => {
    const { client, calls, watch } = setup();
    watch(["staff", "orders"]);
    await flush();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    await act(() => refreshAdminData(client));
    expect(calls["staff/orders"]).toBe(1);
    dialog.remove();

    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    await act(() => refreshAdminData(client));
    expect(calls["staff/orders"]).toBe(1);
    await act(() => refreshAdminData(client, { force: true }));
    expect(calls["staff/orders"]).toBe(2);
  });

  it("a page with unsaved changes pauses it", async () => {
    const { client, calls, watch } = setup();
    watch(["staff", "book", 7]);
    await flush();
    const pause = renderHook(({ on }) => usePauseAutoRefresh(on), { initialProps: { on: true } });
    await act(() => refreshAdminData(client));
    expect(calls["staff/book/7"]).toBe(1);
    pause.rerender({ on: false });
    await act(() => refreshAdminData(client));
    expect(calls["staff/book/7"]).toBe(2);
  });

  it("runs every 30 seconds while the tab is visible", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { client, calls, watch } = setup();
    watch(["staff", "returns"]);
    await vi.advanceTimersByTimeAsync(10);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    renderHook(() => useAdminAutoRefresh(true), { wrapper });
    await vi.advanceTimersByTimeAsync(AUTO_REFRESH_MS + 50);
    expect(calls["staff/returns"]).toBe(2);
    await vi.advanceTimersByTimeAsync(AUTO_REFRESH_MS);
    expect(calls["staff/returns"]).toBe(3);
  });

  it("shows when the page was updated", async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <RefreshNote />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Updates by itself · just now/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh now" })).toBeInTheDocument();
  });
});

describe("customer auto refresh", () => {
  const interval = (status: string) => {
    const options = orderQueries.order(1) as unknown as { refetchInterval: (q: unknown) => number | false };
    return options.refetchInterval({ state: { data: { status } } });
  };

  it("asks again every 60 s while an order is moving, not once it is finished", () => {
    for (const s of ["pending", "paid", "processing", "shipped"]) expect(interval(s)).toBe(CUSTOMER_REFRESH_MS);
    for (const s of ["delivered", "cancelled", "returned"]) expect(interval(s)).toBe(false);
  });

  it("returns: requested and approved refresh, refunded does not", () => {
    const options = orderQueries.return(1) as unknown as { refetchInterval: (q: unknown) => number | false };
    expect(options.refetchInterval({ state: { data: { status: "approved" } } })).toBe(CUSTOMER_REFRESH_MS);
    expect(options.refetchInterval({ state: { data: { status: "refunded" } } })).toBe(false);
    const list = orderQueries.orders() as unknown as { refetchInterval: (q: unknown) => number | false };
    expect(list.refetchInterval({ state: { data: { data: [{ status: "delivered" }, { status: "shipped" }] } } })).toBe(CUSTOMER_REFRESH_MS);
    expect(list.refetchInterval({ state: { data: { data: [{ status: "delivered" }] } } })).toBe(false);
  });
});
