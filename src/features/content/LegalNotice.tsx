import { FileWarning } from "lucide-react";
import { legal } from "@/content/shop";

const updated = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(legal.updated));

/** Last-updated line for legal pages, plus a draft warning until `legal.reviewed` is true in src/content/shop.ts. */
export function LegalNotice() {
  return (
    <div className="grid gap-3">
      {legal.reviewed ? null : (
        <div role="note" className="flex gap-3 rounded-xl border border-warning/40 bg-warning-tint p-4 text-[15px] leading-6 text-foreground">
          <FileWarning className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Draft, not yet reviewed.</strong> This page describes how Bookly works today in plain language. It will be
            checked before the shop opens, and may change.
          </p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Last updated <time dateTime={legal.updated}>{updated}</time>
      </p>
    </div>
  );
}
