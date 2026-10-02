import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./errors";

// Retrying cannot fix a 4xx (validation, not found, forbidden); network blips and 5xx get two more tries.
const shouldRetry = (failureCount: number, error: unknown) => {
  const { kind } = ApiError.from(error);
  return (kind === "network" || kind === "server") && failureCount < 2;
};

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 60_000, // catalogue data changes rarely; avoid refetching on every visit
        gcTime: 10 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false, // never repeat a write automatically (checkout uses an idempotency key instead)
      },
    },
  });
