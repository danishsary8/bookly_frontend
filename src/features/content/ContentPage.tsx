import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Languages } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { Bookplate, type PlateFact } from "./Bookplate";
import { proseClass } from "./prose";
import { useT } from "@/i18n";

export type ContentSection = { id: string; title: string; body: ReactNode };

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const targets = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function Contents({ sections, numbered, active, onPick, lang }: { sections: ContentSection[]; numbered: boolean; active: string; onPick?: () => void; lang?: string }) {
  return (
    <ol lang={lang} className="grid gap-0.5">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={onPick}
            aria-current={active === s.id ? "location" : undefined}
            className={cn(
              "flex min-h-10 items-baseline gap-3 rounded-md border-l-2 px-3 py-2 text-[15px] leading-5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
              active === s.id ? "border-primary bg-lapis-tint font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {numbered ? <span className="w-5 shrink-0 tabular-nums">{i + 1}.</span> : null}
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/*
 * Layout for the help and legal pages: breadcrumb, the bookplate, then a
 * contents rail (sticky, with the section in view marked) beside a reading-width
 * article. On phones the contents fold into "On this page". Legal pages number
 * their sections (clauses are referred to by number); help pages don't.
 */
export function ContentPage({
  title,
  documentTitle,
  crumb,
  eyebrow,
  lead,
  facts,
  plate,
  notice,
  sections,
  numbered = false,
  englishOnly = false,
  after,
}: {
  title: string;
  documentTitle?: string;
  /** Short label for the breadcrumb when the title is long. */
  crumb?: string;
  eyebrow: string;
  lead?: ReactNode;
  facts?: PlateFact[];
  /** Extra content inside the bookplate, e.g. an action. */
  plate?: ReactNode;
  /** Shown above the article, e.g. a draft notice. */
  notice?: ReactNode;
  sections: ContentSection[];
  numbered?: boolean;
  /** The text exists only in English (legal and help pages): Khmer readers get a short note, and the text is marked lang="en". */
  englishOnly?: boolean;
  /** Full-width content after the article (a shelf, a call to action). */
  after?: ReactNode;
}) {
  useDocumentTitle(documentTitle ?? title, { description: typeof lead === "string" ? lead : null });
  // Opening /privacy#delete from another site: the page is loaded after the browser looked for the
  // section, so jump to it once it exists.
  const { hash } = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  const [ids] = useState(() => sections.map((s) => s.id));
  const active = useActiveSection(ids);
  const [open, setOpen] = useState(false);
  const { dict, lang } = useT();
  const crumbs: Crumb[] = [{ label: dict.content.home, to: "/" }, { label: crumb ?? title }];
  const textLang = englishOnly && lang !== "en" ? "en" : undefined;

  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8">
      <Breadcrumb items={crumbs} />
      <div lang={textLang}>
        <Bookplate eyebrow={eyebrow} title={title} lead={lead} facts={facts} className="mt-4">
          {plate}
        </Bookplate>
      </div>
      {textLang ? (
        <p role="note" className="mt-6 flex items-start gap-2 rounded-lg bg-lapis-tint px-4 py-3 text-[15px] text-foreground">
          <Languages className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          {dict.content.englishOnly}
        </p>
      ) : null}

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-6">
        <nav aria-label={dict.content.onThisPage} className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card lg:hidden">
            <button
              type="button"
              aria-expanded={open}
              aria-controls="contents-mobile"
              onClick={() => setOpen((o) => !o)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {dict.content.onThisPage}
              <ChevronDown className={cn("size-5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
            </button>
            {open ? (
              <div id="contents-mobile" className="border-t border-border p-2">
                <Contents sections={sections} numbered={numbered} active={active} onPick={() => setOpen(false)} lang={textLang} />
              </div>
            ) : null}
          </div>
          <div className="hidden lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:block">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{dict.content.onThisPage}</p>
            <Contents sections={sections} numbered={numbered} active={active} lang={textLang} />
          </div>
        </nav>

        <article lang={textLang} className="grid gap-14 lg:col-span-8 lg:col-start-5" aria-labelledby="page-title">
          {notice}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-[calc(var(--header-h)+1.5rem)]">
              <h2 id={`${s.id}-title`} className="flex items-baseline gap-4 font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
                {numbered ? (
                  <span className="text-[1.125rem] tabular-nums text-accent-text" aria-hidden="true">
                    {i + 1}.
                  </span>
                ) : null}
                <span>{s.title}</span>
              </h2>
              <div className={cn(proseClass, "mt-5 text-foreground/90")}>{s.body}</div>
            </section>
          ))}
        </article>
      </div>
      {after}
    </div>
  );
}
