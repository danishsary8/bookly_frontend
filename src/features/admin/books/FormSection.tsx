import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One titled group of fields on the book form: a short heading, a one-line hint and the fields. */
export function FormSection({ id, title, hint, children, className }: { id: string; title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("book-form-section grid content-start gap-4", className)}>
      <header className="grid gap-0.5">
        <h3 id={id} className="font-sans text-[0.9375rem] font-semibold tracking-normal text-foreground">
          {title}
        </h3>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
