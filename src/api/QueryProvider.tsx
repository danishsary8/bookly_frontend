import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { LANGUAGE_CHANGED_EVENT } from "@/i18n";
import { createQueryClient } from "./queryClient";

// Devtools only in development; the import is dropped from production builds.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })))
  : null;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  useEffect(() => {
    const onLanguageChange = () => {
      client.invalidateQueries();
    };
    window.addEventListener(LANGUAGE_CHANGED_EVENT, onLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, onLanguageChange);
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      {Devtools && (
        <Suspense fallback={null}>
          <Devtools buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
