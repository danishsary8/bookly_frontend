import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

import { triggerSentryTestError } from "./sentryTestError";

export default function SentryTestPage() {
  useDocumentTitle("Sentry source map test", { noindex: true });

  return (
    <main className="container-shell py-16">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Sentry source map test
        </h1>
        <div>
          <Button variant="destructive" onClick={triggerSentryTestError}>
            Throw test error
          </Button>
        </div>
      </div>
    </main>
  );
}
