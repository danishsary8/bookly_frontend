import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
 * The screen around printable sheets: a toolbar (back, optional mode/date controls,
 * summary, Print) that never prints, and the A4 sheets below it. With ?autoprint=1
 * (the buttons that open this page in a new tab) the print dialog opens once fonts
 * and async elements (such as invoice QR SVGs) have painted.
 */
export function PrintFrame({
  title,
  summary,
  controls,
  backTo,
  backLabel,
  ready,
  children,
  printLabel = "Print",
}: {
  title: string;
  summary?: ReactNode;
  controls?: ReactNode;
  backTo: string;
  backLabel: string;
  ready: boolean;
  children: ReactNode;
  printLabel?: string;
}) {
  useDocumentTitle(title, { noindex: true });
  const [params] = useSearchParams();
  const autoprint = params.get("autoprint") === "1";
  const printed = useRef(false);

  useEffect(() => {
    if (!ready || !autoprint || printed.current) return;
    let cancelled = false;
    let timer: number | undefined;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void fonts.then(() => {
      if (cancelled) return;
      // Allow a brief paint window so async invoice QR SVGs and multi-sheet batches finish rendering before print snapshot.
      timer = window.setTimeout(() => {
        if (cancelled) return;
        printed.current = true;
        window.print();
      }, 180);
    });
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [ready, autoprint]);

  return (
    <div className="print-canvas min-h-dvh bg-surface-2">
      <div className="print-hide sticky top-0 z-(--z-header) border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to={backTo} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              <ArrowLeft className="size-4" aria-hidden="true" /> {backLabel}
            </Link>
            {controls ? <div className="flex flex-wrap items-center gap-2">{controls}</div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
            <Button onClick={() => window.print()} disabled={!ready}>
              <Printer aria-hidden="true" /> {printLabel}
            </Button>
          </div>
        </div>
      </div>
      <main className="print-sheets grid justify-center gap-6 px-4 py-6">
        <h1 className="print-hide font-display text-3xl leading-tight text-foreground">{title}</h1>
        {children}
      </main>
    </div>
  );
}
