import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { cn } from "@/lib/utils";

/** Top of a storefront page: breadcrumb, optional eyebrow, the page's only h1, and a lead line. */
export function PageHeader({ crumbs, eyebrow, title, lead, aside, className }: { crumbs?: Crumb[]; eyebrow?: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <header className={cn("grid gap-3 pb-8 pt-6 sm:pt-8", className)}>
      {crumbs ? <Breadcrumb items={crumbs} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid max-w-3xl gap-2">
          {eyebrow ? (
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
              <span className="h-px w-12 bg-current" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-[2.441rem] leading-[1.1] text-foreground sm:text-[3.052rem]">{title}</h1>
          {lead ? <div className="text-lg leading-7 text-muted-foreground">{lead}</div> : null}
        </div>
        {aside}
      </div>
    </header>
  );
}
