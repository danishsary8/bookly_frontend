import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PlateFact = { value: ReactNode; label: ReactNode };

/*
 * The help pages' signature (design-system/bookly/pages/content.md): a lapis
 * "ex libris" plate, like the label pasted inside a book's cover, carrying the
 * page title and the few house rules a visitor came to check. With facts (redesign 2026-11-10, pages/content.md):
 * two columns on laptops, title and lead on the left, the facts stacked on the right between gold hairlines, so the
 * article starts on the first screen. Without facts (404): centred. Facts are a <dl>: label = term, value = description.
 */
export function Bookplate({ eyebrow, title, lead, facts, children, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; facts?: PlateFact[]; children?: ReactNode; className?: string }) {
  const split = Boolean(facts?.length);
  return (
    <section aria-labelledby="page-title" className={cn("hero-lapis p-2 sm:p-3", className)}>
      <div
        className={cn(
          "bookplate-frame relative px-5 py-8 sm:px-10 sm:py-10 lg:px-14",
          split ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-center lg:gap-14" : "text-center",
        )}
      >
        {(["left-0 top-0", "right-0 top-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((corner) => (
          <span key={corner} className={cn("bookplate-corner", corner)} aria-hidden="true" />
        ))}
        <div>
          <p className={cn("flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold", !split && "justify-center")}>
            <span className="h-px w-8 bg-current opacity-60 sm:w-12" aria-hidden="true" />
            <span>
              <span className="hidden text-on-lapis-muted sm:inline">
                Ex libris Bookly<span className="mx-2" aria-hidden="true">·</span>
              </span>
              {eyebrow}
            </span>
            {split ? null : <span className="h-px w-8 bg-current opacity-60 sm:w-12" aria-hidden="true" />}
          </p>
          <h1 id="page-title" className={cn("mt-4 max-w-3xl font-display text-[clamp(2.25rem,4.4vw,3.4rem)] leading-[1.05] text-on-lapis", !split && "mx-auto")}>
            {title}
          </h1>
          {lead ? <div className={cn("mt-4 max-w-2xl text-lg leading-7 text-on-lapis-muted", !split && "mx-auto")}>{lead}</div> : null}
          {children ? <div className={cn("mt-7 flex flex-wrap gap-3", !split && "justify-center")}>{children}</div> : null}
        </div>
        {split ? (
          <dl className="grid divide-y divide-gold/25 border-t border-gold/35 lg:border-l lg:border-t-0 lg:pl-10">
            {facts!.map((fact, i) => (
              <div key={i} className="flex flex-col-reverse gap-1.5 py-3.5 first:pt-4 last:pb-0 lg:first:pt-0">
                <dt className="text-[15px] leading-6 text-on-lapis-muted">{fact.label}</dt>
                <dd className="font-display text-[1.75rem] leading-none tabular-nums text-gold sm:text-[2rem]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
