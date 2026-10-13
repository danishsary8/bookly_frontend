import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
 * The screen around printable sheets: a toolbar (back, what is shown, Print) that never
 * prints, and the A4 sheets below it. With ?autoprint=1 (the buttons that open this page
 * in a new tab) the print dialog opens once the sheets are ready.
 */
export function PrintFrame({ title, summary, backTo, backLabel, ready, children }: { title: string; summary?: ReactNode; backTo: string; backLabel: string; ready: boolean; children: ReactNode }) {
  useDocumentTitle(title, { noindex: true });
  const [params] = useSearchParams();
  const autoprint = params.get("autoprint") === "1";
  const printed = useRef(false);

  useEffect(() => {
    if (!ready || !autoprint || printed.current) return;
    printed.current = true;
    // Let the fonts finish so the first print already has the real type.
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void fonts.then(() => window.print());
  }, [ready, autoprint]);

  return (
    <div className="print-canvas min-h-dvh bg-surface-2">
      <div className="print-hide sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" /> {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
            <Button onClick={() => window.print()} disabled={!ready}>
              <Printer aria-hidden="true" /> Print
            </Button>
          </div>
        </div>
      </div>
      <main className="print-sheets grid justify-center gap-6 px-4 py-6">
        <h1 className="sr-only">{title}</h1>
        {children}
      </main>
    </div>
  );
}
