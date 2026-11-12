import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, ChevronDown, Languages, MessagesSquare, Phone, Send } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Breadcrumb, type Crumb } from "@/components/Breadcrumb";
import { contact } from "@/content/shop";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { proseClass } from "./prose";
import { useT, type Translations } from "@/i18n";

export type ContentSection = { id: string; title: string; body: ReactNode };
export type Fact = { value: ReactNode; label: ReactNode };
type PageKey = keyof Translations["infoPages"]["pages"];

/** Every help and policy page, in the side menu on laptops and the menu button on phones. */
const INFO_PAGES: { to: string; key: PageKey }[] = [
  { to: "/shipping", key: "shipping" },
  { to: "/returns-policy", key: "returns" },
  { to: "/faq", key: "faq" },
  { to: "/contact", key: "contact" },
  { to: "/about", key: "about" },
  { to: "/privacy", key: "privacy" },
  { to: "/terms", key: "terms" },
];

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

const menuLink = (active: boolean) =>
  cn(
    "flex min-h-11 items-baseline gap-3 rounded-md border-l-2 px-3 py-2.5 text-[15px] leading-5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
    active ? "border-primary bg-lapis-tint font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
  );

/** The side menu: every info page (the current one marked), then this page's sections with the one in view marked. */
function Menu({ sections, numbered, active, onPick, lang }: { sections: ContentSection[]; numbered: boolean; active: string; onPick?: () => void; lang?: string }) {
  const { dict } = useT();
  const t = dict.infoPages;
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <p id="info-pages-label" className="px-3 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t.menu}
        </p>
        <ul aria-labelledby="info-pages-label" className="grid gap-0.5">
          {INFO_PAGES.map((page) => (
            <li key={page.to}>
              <NavLink to={page.to} onClick={onPick} className={({ isActive }) => menuLink(isActive)}>
                {t.pages[page.key]}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      {sections.length > 1 ? (
        <div className="grid gap-1">
          <p id="on-this-page-label" className="px-3 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {dict.content.onThisPage}
          </p>
          <ol aria-labelledby="on-this-page-label" lang={lang} className="grid gap-0.5">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={onPick} aria-current={active === s.id ? "location" : undefined} className={menuLink(active === s.id)}>
                  {numbered ? <span className="w-5 shrink-0 tabular-nums">{i + 1}.</span> : null}
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** Key facts as small cards under the title (fees, the return window, opening hours). */
function FactCards({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {facts.map((fact, i) => (
        <div key={i} className="shop-card flex flex-col-reverse justify-end gap-1 rounded-2xl border border-border bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">{fact.label}</dt>
          <dd className="font-display text-[1.6rem] leading-tight text-foreground">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The foot of every info page: three ways to get help, then the shop and related pages. */
function StillNeedHelp({ related }: { related: { to: string; label: string }[] }) {
  const { dict } = useT();
  const { pathname } = useLocation();
  const t = dict.infoPages;
  const all = [
    { href: "/account/support", internal: true, Icon: MessagesSquare, title: t.chat, text: t.chatText },
    { href: contact.telegramHref, internal: false, Icon: Send, title: `${dict.content.telegram} ${contact.telegram}`, text: t.telegramText },
    { href: "/contact", internal: true, Icon: Phone, title: dict.content.contactUs, text: t.contactText },
  ];
  // The contact page doesn't link to itself.
  const ways = all.filter((way) => way.href !== pathname);
  const card =
    "shop-card group flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 outline-none transition-[border-color,translate] duration-150 hover:-translate-y-0.5 hover:border-input focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0";
  const inner = (Icon: typeof Send, title: string, text: string) => (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="grid gap-0.5">
        <span className="font-semibold [overflow-wrap:anywhere] group-hover:text-primary">{title}</span>
        <span className="text-[15px] text-muted-foreground">{text}</span>
      </span>
    </>
  );
  return (
    <section aria-labelledby="still-need-help" className="mt-16 grid gap-6">
      <div className="grid gap-1">
        <h2 id="still-need-help" className="text-balance font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
          {t.stillNeedHelp}
        </h2>
        <p className="text-muted-foreground">{t.stillLead}</p>
      </div>
      <ul className={cn("grid gap-3", ways.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {ways.map(({ href, internal, Icon, title, text }) => (
          <li key={href}>
            {internal ? (
              <Link to={href} className={card}>
                {inner(Icon, title, text)}
              </Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer" className={card}>
                {inner(Icon, title, text)}
                <span className="sr-only">{dict.content.opensTelegram}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
      <nav aria-label={t.related} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5">
        <Link to="/books" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline">
          {t.browse} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {related.map((r) => (
          <Link key={r.to} to={r.to} className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {r.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}

/*
 * Layout for the help and policy pages (pages/content.md): breadcrumb, eyebrow, the Gloock title and one lead line,
 * key facts as small cards; then a sticky side menu (every info page, then "On this page" with the section in view
 * marked) beside a ~68ch reading sheet. Phones fold the menu into one button. Legal pages number their sections
 * (clauses are referred to by number) and give each a Back to top link. Every page ends with "Still need help?".
 */
export function ContentPage({
  title,
  documentTitle,
  crumb,
  eyebrow,
  lead,
  facts,
  action,
  notice,
  highlight,
  sections = [],
  children,
  numbered = false,
  englishOnly = false,
  related = [],
  after,
}: {
  title: string;
  documentTitle?: string;
  /** Short label for the breadcrumb when the title is long. */
  crumb?: string;
  eyebrow: string;
  lead?: ReactNode;
  facts?: Fact[];
  /** A button or link beside the title (FAQ: contact us). */
  action?: ReactNode;
  /** Shown above the article, e.g. a draft notice. */
  notice?: ReactNode;
  /** At the top of the reading sheet, before the sections (fee cards, return steps, the FAQ search). */
  highlight?: ReactNode;
  sections?: ContentSection[];
  /** A page that isn't a list of sections (contact) puts its own content in the sheet. */
  children?: ReactNode;
  numbered?: boolean;
  /** The text exists only in English (legal and help pages): Khmer readers get a short note, and the text is marked lang="en". */
  englishOnly?: boolean;
  /** Related pages in the "Still need help?" footer. */
  related?: { to: string; label: string }[];
  /** Full-width content after the sheet (a shelf). */
  after?: ReactNode;
}) {
  useDocumentTitle(documentTitle ?? title, { description: typeof lead === "string" ? lead : null });
  // Opening /privacy#delete from another site: the page is loaded after the browser looked for the section.
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
  const t = dict.infoPages;
  const crumbs: Crumb[] = [{ label: dict.content.home, to: "/" }, { label: crumb ?? title }];
  const textLang = englishOnly && lang !== "en" ? "en" : undefined;

  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8 short:pt-4">
      <Breadcrumb items={crumbs} />
      <header id="page-top" lang={textLang} className="mt-3 grid scroll-mt-[calc(var(--header-h)+1rem)] gap-6 short:gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="grid max-w-3xl gap-2">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
              <span className="h-px w-10 bg-current" aria-hidden="true" />
              {eyebrow}
            </p>
            <h1 id="page-title" className="text-balance font-display text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08]">
              {title}
            </h1>
            {lead ? <div className="text-lg leading-7 text-muted-foreground short:text-base">{lead}</div> : null}
          </div>
          {action}
        </div>
        {facts?.length ? <FactCards facts={facts} /> : null}
      </header>
      {textLang ? (
        <p role="note" className="mt-6 flex items-start gap-2 rounded-lg bg-lapis-tint px-4 py-3 text-[15px] text-foreground">
          <Languages className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          {dict.content.englishOnly}
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label={t.menu}>
          {/* Phones and tablets: one menu button. */}
          <div className="shop-card rounded-2xl border border-border bg-card lg:hidden">
            <button
              type="button"
              aria-expanded={open}
              aria-controls="info-menu-mobile"
              onClick={() => setOpen((o) => !o)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t.menuButton}
              <ChevronDown className={cn("size-5 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
            </button>
            {open ? (
              <div id="info-menu-mobile" className="border-t border-border p-2">
                <Menu sections={sections} numbered={numbered} active={active} onPick={() => setOpen(false)} lang={textLang} />
              </div>
            ) : null}
          </div>
          <div className="hidden max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto overscroll-contain lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:block">
            <Menu sections={sections} numbered={numbered} active={active} lang={textLang} />
          </div>
        </nav>

        <div className="min-w-0">
          <article lang={textLang} aria-labelledby="page-title" className="shop-card grid gap-12 rounded-2xl border border-border bg-card px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
            {notice}
            {highlight}
            {children}
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="max-w-[68ch] scroll-mt-[calc(var(--header-h)+1.5rem)]">
                <h2 id={`${s.id}-title`} className="flex items-baseline gap-4 text-balance font-display text-[clamp(1.6rem,2.6vw,2rem)] leading-[1.15]">
                  {numbered ? (
                    <span className="text-[1.125rem] tabular-nums text-accent-text" aria-hidden="true">
                      {i + 1}.
                    </span>
                  ) : null}
                  <span>{s.title}</span>
                </h2>
                <div className={cn(proseClass, "mt-5 text-foreground/90")}>{s.body}</div>
                {numbered ? (
                  <a href="#page-top" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                    <ArrowUp className="size-4" aria-hidden="true" /> {t.backToTop}
                  </a>
                ) : null}
              </section>
            ))}
          </article>
          {after}
          <StillNeedHelp related={related} />
        </div>
      </div>
    </div>
  );
}
