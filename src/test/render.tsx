import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/** Renders inside a router and a fresh query client (no retries, so errors show at once). */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", locationState }: { route?: string; locationState?: unknown } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const entry = locationState !== undefined ? { pathname: route, state: locationState } : route;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}
