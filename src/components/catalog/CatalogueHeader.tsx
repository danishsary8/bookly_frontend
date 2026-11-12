import { useId, useState, type ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { CoverStack } from "@/components/shopping/CoverStack";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

type CoverItem = { src?: string | null; title?: string | null };

/*
 * Top of every catalogue page (pages/catalogue-v2.md §2). Two shapes:
 * - "index" (All books, search, authors, series): breadcrumb, eyebrow, the h1 and one lead line, with a small fan of
 *   the listing's own covers on the right from md up. Kept short so the first row of books fits a laptop screen.
 * - "entity" (one category, author, series, publisher, collection or reading list): the same text on a paper sheet,
 *   with `media` (a portrait) on the left, `facts` (counts and links to related pages) and `actions` under the lead,
 *   and the covers fanned on the right over a soft wash of the first one.
 * Long blurbs are clamped to three lines with a Read more toggle. On short laptop screens (`short:`) the eyebrow and the
 * cover fan give way and the lead sits beside the title, so the first row of books stays on the first screen.
 */
type Props = {
  crumbs: Crumb[];
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** A longer description (author bio, series blurb): clamped, with Read more. */
  blurb?: string | null;
  covers?: CoverItem[];
  media?: ReactNode;
  facts?: ReactNode;
  actions?: ReactNode;
  /** Index variant: shown on the right instead of the covers (the search page's own field). */
  aside?: ReactNode;
  variant?: "index" | "entity";
};

function Blurb({ text }: { text: string }) {
  const { dict } = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  // Short blurbs never clamp, so they get no toggle.
  const long = text.length > 220;
  return (
    <div className="grid justify-items-start gap-1">
      <p id={id} className={cn("max-w-prose whitespace-pre-line text-base leading-7 text-muted-foreground", long && !open && "line-clamp-3")}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="-mx-1 inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? dict.catalogue.readLess : dict.catalogue.readMore}
        </button>
      ) : null}
    </div>
  );
}

export function CatalogueHeader({ crumbs, eyebrow, title, lead, blurb, covers, media, facts, actions, aside, variant = "index" }: Props) {
  const shown = (covers ?? []).filter((c) => c.src);
  const entity = variant === "entity";
  const fan = shown.length >= 2 ? <CoverStack items={shown} size={entity ? "lg" : "md"} max={entity ? 5 : 4} /> : null;

  const text = (
    <div className="grid min-w-0 content-start gap-2">
      {/* The eyebrow gives way on short laptop screens. */}
      {eyebrow ? (
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text short:hidden">
          <span className="h-px w-10 shrink-0 bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
      ) : null}
      {/* Short laptop screens: the lead sits beside the title, so the first row of books fits. */}
      <div className="grid gap-2 short:flex short:flex-wrap short:items-baseline short:gap-x-5 short:gap-y-1">
        <h1 className="font-display text-[2rem] leading-[1.1] text-foreground [overflow-wrap:anywhere] sm:text-[2.5rem] short:text-[2.15rem]">{title}</h1>
        {lead ? <div className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg short:text-base">{lead}</div> : null}
      </div>
      {blurb ? <Blurb text={blurb} /> : null}
      {facts ? <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">{facts}</div> : null}
      {actions ? <div className="mt-2 border-t border-dashed border-border pt-4 short:pt-3">{actions}</div> : null}
    </div>
  );

  if (!entity) {
    return (
      <header className="grid gap-2 pb-6 pt-4 sm:pt-6 short:gap-0 short:pb-4 short:pt-1">
        <Breadcrumb items={crumbs} />
        <div className="group flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          {text}
          {aside ?? (fan ? <div className="hidden shrink-0 pb-1 md:block short:hidden">{fan}</div> : null)}
        </div>
      </header>
    );
  }

  return (
    <header className="grid gap-2 pb-6 pt-4 sm:pt-6 short:gap-1 short:pb-4 short:pt-1">
      <Breadcrumb items={crumbs} />
      <div className="shop-card group relative isolate grid items-center gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:px-9 short:py-4">
        {shown[0]?.src ? (
          <img src={shown[0].src} alt="" aria-hidden="true" className="hero-wash pointer-events-none absolute -right-16 top-1/2 -z-10 h-[170%] w-3/5 -translate-y-1/2 object-cover opacity-20 blur-3xl saturate-150" />
        ) : null}
        <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--card)_40%,transparent)]" aria-hidden="true" />
        <div className={cn("grid min-w-0 gap-5", media && "sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start")}>
          {media}
          {text}
        </div>
        {fan ? <div className="hidden justify-self-end md:block md:pr-2 short:hidden">{fan}</div> : null}
      </div>
    </header>
  );
}
