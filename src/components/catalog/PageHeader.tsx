import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { CoverStack } from "@/components/shopping/CoverStack";
import { cn } from "@/lib/utils";

type CoverItem = { src?: string | null; title?: string | null };

/*
 * Top of a storefront page: breadcrumb, optional eyebrow, the page's only h1, and a lead line.
 * Catalogue pages (pages/catalogue.md) can add real covers from their own listing: `covers` fans them on the
 * right. `variant="panel"` puts the text and covers on one card over a soft wash of the first cover (used for a
 * single category, author, publisher, series, collection or reading list); `media` replaces the covers (e.g. an
 * author's portrait) and `meta` adds a row under the lead (counts, dates, actions).
 */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  aside,
  className,
  covers,
  media,
  meta,
  variant = "plain",
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  className?: string;
  covers?: CoverItem[];
  media?: ReactNode;
  meta?: ReactNode;
  variant?: "plain" | "panel";
}) {
  const shown = (covers ?? []).filter((c) => c.src);
  const right = media ?? (shown.length >= 2 ? <CoverStack items={shown} size={variant === "panel" ? "lg" : "md"} max={variant === "panel" ? 5 : 4} /> : null);
  const wash = variant === "panel" ? shown[0]?.src : null;

  const text = (
    <div className="grid max-w-3xl gap-2">
      {eyebrow ? (
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
          <span className="h-px w-12 bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-[2.441rem] leading-[1.1] text-foreground sm:text-[3.052rem]">{title}</h1>
      {lead ? <div className="text-lg leading-7 text-muted-foreground">{lead}</div> : null}
      {meta ? <div className="mt-2">{meta}</div> : null}
    </div>
  );

  if (variant === "panel") {
    return (
      <header className={cn("grid gap-4 pb-8 pt-6 sm:pt-8", className)}>
        {crumbs ? <Breadcrumb items={crumbs} /> : null}
        <div className="shop-card group relative isolate grid items-center gap-6 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:px-10">
          {wash ? <img src={wash} alt="" aria-hidden="true" className="hero-wash pointer-events-none absolute -right-16 top-1/2 -z-10 h-[170%] w-3/5 -translate-y-1/2 object-cover opacity-20 blur-3xl saturate-150" /> : null}
          <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--card)_35%,transparent)]" aria-hidden="true" />
          {text}
          {right || aside ? (
            <div className="hidden items-center gap-6 justify-self-end md:flex md:pr-2">
              {right}
              {aside}
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("grid gap-3 pb-8 pt-6 sm:pt-8", className)}>
      {crumbs ? <Breadcrumb items={crumbs} /> : null}
      <div className="group flex flex-wrap items-end justify-between gap-4">
        {text}
        {aside}
        {!aside && right ? <div className="hidden pb-1 md:block">{right}</div> : null}
      </div>
    </header>
  );
}
