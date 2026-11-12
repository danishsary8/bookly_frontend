import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * The 404 page's "ex libris" plate (design-system/bookly/pages/content.md): a lapis label like the one pasted inside a
 * book's cover, centred, with the eyebrow, the page title, a lead and an action (the search). The help and policy
 * pages moved to the lighter ContentPage header (2026-11-12).
 */
export function Bookplate({ eyebrow, title, lead, children, className }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section aria-labelledby="page-title" className={cn("hero-lapis p-2 sm:p-3", className)}>
      <div className="bookplate-frame relative px-5 py-8 text-center sm:px-10 sm:py-10 lg:px-14">
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
        <h1 id="page-title" className="mx-auto mt-4 max-w-3xl text-balance font-display text-[clamp(2.25rem,4.4vw,3.4rem)] leading-[1.05] text-on-lapis">
          {title}
        </h1>
        {lead ? <div className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-on-lapis-muted">{lead}</div> : null}
        {children ? <div className="mt-7 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
