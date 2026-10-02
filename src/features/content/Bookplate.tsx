import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PlateFact = { value: ReactNode; label: ReactNode };

/*
 * The help pages' signature (design-system/bookly/pages/content.md): a lapis
 * "ex libris" plate, like the label pasted inside a book's cover, carrying the
 * page title and the few house rules a visitor came to check. Centred and
 * symmetrical like a real bookplate: a cartouche line, the title, then the facts
 * split by gold hairlines. Facts are a <dl>: label = term, value = description.
 */
export function Bookplate({ eyebrow, title, lead, facts, children, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; facts?: PlateFact[]; children?: ReactNode; className?: string }) {
  return (
    <section aria-labelledby="page-title" className={cn("hero-lapis p-2 sm:p-3", className)}>
      <div className="bookplate-frame relative px-5 py-9 text-center sm:px-10 sm:py-12 lg:px-16">
        {(["left-0 top-0", "right-0 top-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((corner) => (
          <span key={corner} className={cn("bookplate-corner", corner)} aria-hidden="true" />
        ))}
        <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold">
          <span className="h-px w-8 bg-current opacity-60 sm:w-12" aria-hidden="true" />
          <span>
            <span className="hidden text-on-lapis-muted sm:inline">
              Ex libris Bookly<span className="mx-2" aria-hidden="true">·</span>
            </span>
            {eyebrow}
          </span>
          <span className="h-px w-8 bg-current opacity-60 sm:w-12" aria-hidden="true" />
        </p>
        <h1 id="page-title" className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.25rem,4.6vw,3.6rem)] leading-[1.05] text-on-lapis">
          {title}
        </h1>
        {lead ? <div className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-on-lapis-muted">{lead}</div> : null}
        {facts?.length ? (
          <dl
            className={cn(
              "mx-auto mt-8 grid max-w-4xl border-t border-gold/35 pt-3 sm:mt-9 sm:pt-7",
              "divide-y divide-gold/25 sm:divide-x sm:divide-y-0",
              facts.length === 3 ? "sm:grid-cols-3" : facts.length === 2 ? "sm:grid-cols-2" : "",
            )}
          >
            {facts.map((fact, i) => (
              <div key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-4 py-3 text-left sm:flex sm:flex-col sm:items-center sm:gap-2 sm:px-4 sm:py-0 sm:text-center">
                <dt className="order-2 text-[15px] leading-6 text-on-lapis-muted sm:max-w-[22ch]">{fact.label}</dt>
                <dd className="order-1 font-display text-[1.75rem] leading-none tabular-nums text-gold sm:text-[2.25rem]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {children ? <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
