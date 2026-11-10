import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import BlurText from "@/components/BlurText";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import { LiveSearch } from "@/components/shell/LiveSearch";
import { CtaGlare } from "@/components/CtaGlare";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home hero (MASTER §2.1a, §5; pages/home.md): full-bleed lapis band tinted by the current cover (blurred), a
 * BlurText headline, the page's one vermilion CTA (with GlareHover), live
 * catalogue numbers (CountUp) and a cover slideshow: 3.5s autoplay that stops
 * for the pause button, hover, keyboard focus and reduced motion; ←/→ keys,
 * prev/next buttons and an "n of N" label announced when not autoplaying.
 */

const SLIDE_MS = 4000;

const iconButton =
  "inline-flex size-9 items-center justify-center rounded-full border border-on-lapis-muted/40 text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95";

export function HomeHero({ featured, label }: { featured: BookCard[] | undefined; label?: string }) {
  const tree = useQuery(catalogQueries.categoryTree());
  const topCategories = [...(tree.data ?? [])].filter((c) => c.slug && (c.total_books ?? 0) > 0).sort((a, b) => (b.total_books ?? 0) - (a.total_books ?? 0)).slice(0, 5);
  const currency = useCurrency();
  const { dict, lang } = useT();
  const h = dict.homePage;
  const reduceMotion = useReducedMotion();
  const books = featured ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const current = books[index % Math.max(books.length, 1)];
  // Short description of the current book: cards don't carry one, so read the book (cached per book).
  const detail = useQuery({ ...catalogQueries.book(current?.id ?? 0), enabled: Boolean(current?.id), staleTime: 10 * 60_000 });
  const blurb = shortBlurb(detail.data?.description);
  const autoplaying = books.length > 1 && !reduceMotion && !paused && !hovered && !focused;

  useEffect(() => {
    if (!autoplaying) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % books.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [autoplaying, books.length]);

  const step = (delta: number) => books.length && setIndex((i) => (i + delta + books.length) % books.length);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    // An inset card: its edges line up with the sections below, with a strip of page showing around it.
    <div className="container-shell pb-8 pt-3 sm:pb-10 sm:pt-4">
    <section className="hero-lapis relative isolate overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-40px_rgb(20_32_122/0.6)]" aria-labelledby="home-hero-title">
      {/* The current cover, hugely blurred, tints the band so each slide brings its own colour. */}
      {current?.cover_image_url ? (
        <img
          key={current.id}
          src={current.cover_image_url}
          alt=""
          aria-hidden="true"
          className="hero-wash pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-40 blur-3xl saturate-125"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_70%_at_25%_40%,rgb(20_32_122/0.85),rgb(20_32_122/0.45)_60%,rgb(10_16_60/0.8))]" aria-hidden="true" />

      <div className="grid grid-cols-1 items-center gap-12 px-6 py-12 sm:px-10 lg:h-[clamp(560px,calc(100svh-var(--header-h)-2.5rem),840px)] lg:grid-cols-12 lg:gap-x-10 lg:px-14 lg:py-10">
        <div className="lg:col-span-7">
          <p className="eyebrow">{h.heroEyebrow}</p>
          <h1 id="home-hero-title" className="mt-4 font-display text-[clamp(2.4rem,4.4vw,4rem)] leading-[1.03] tracking-[-0.02em] text-on-lapis [@media(max-height:820px)]:text-[clamp(2.2rem,3.8vw,3.4rem)]">
            <BlurText
              key={lang}
              as="span"
              text={dict.home.heroTitle}
              delay={60}
              animateBy="words"
              animationFrom={{ filter: "blur(8px)", opacity: 0, y: 24 }}
              animationTo={[{ filter: "blur(0px)", opacity: 1, y: 0 }]}
              stepDuration={0.7}
              easing={[0.16, 1, 0.3, 1]}
            />
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-[1.6] text-on-lapis-muted">{dict.home.heroSubtitle}</p>


          {/* Search first: most visitors arrive knowing roughly what they want. */}
          <LiveSearch
            id="hero-search"
            className="mt-8 max-w-xl [&>svg:first-of-type]:left-5 [&>svg:first-of-type]:size-5"
            inputClassName="h-14 rounded-full border-transparent bg-card pl-14 pr-12 text-[17px] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)] focus-visible:ring-gold focus-visible:ring-offset-transparent"
          />
          {topCategories.length ? (
            <nav aria-label={h.popularCategories} className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-on-lapis-muted">{h.popularCategories}:</span>
              {topCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-on-lapis-muted/40 px-3.5 text-sm font-medium text-on-lapis transition-colors hover:border-on-lapis/70 hover:bg-on-lapis/10"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <CtaGlare>
              <Link
                to="/books"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-foreground transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97] motion-reduce:active:scale-100"
              >
                {dict.home.browseCatalogue} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CtaGlare>
            <Link
              to="/books?sort=newest"
              className="group/nr inline-flex h-11 items-center gap-1.5 px-3 text-[15px] font-semibold text-on-lapis underline-offset-[6px] hover:underline"
            >
              {dict.home.newReleases} <ArrowRight className="size-4 transition-transform duration-200 group-hover/nr:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          {books.length === 0 ? (
            <div className="mx-auto grid w-full max-w-[400px] justify-items-center gap-5" aria-hidden="true">
              <Skeleton className="aspect-[2/3] w-[min(260px,60%)] bg-on-lapis/10" />
              <Skeleton className="h-6 w-3/5 bg-on-lapis/10" />
              <Skeleton className="h-4 w-2/5 bg-on-lapis/10" />
              <Skeleton className="h-11 w-4/5 rounded-full bg-on-lapis/10" />
            </div>
          ) : (
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label={label ?? h.topRated}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setFocused(true)}
              onBlur={onBlur}
              className="mx-auto w-full max-w-[420px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-8 focus-visible:ring-offset-transparent"
            >
              {/* The stack: the current cover in front, its neighbours peeking out behind on each side.
                  Each cover stands on a glossy floor: a soft mirror image fades out below it. */}
              <div className="relative mx-auto w-[min(320px,70%,calc((100svh-var(--header-h)-24rem)*0.66))]">
                <span className="pointer-events-none absolute left-1/2 top-[38%] -z-10 size-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(120_150_255/0.28),transparent)]" aria-hidden="true" />
                <div className="relative aspect-[2/3]">
                  {books.map((book, i) => {
                    const n = books.length;
                    const off = ((i - index + n) % n + n) % n;
                    const pos = off === 0 ? "front" : off === 1 ? "next" : off === n - 1 ? "prev" : off === 2 ? "far-next" : off === n - 2 ? "far-prev" : "hidden";
                    if (pos === "hidden") return null;
                    const front = pos === "front";
                    return (
                      <div key={book.id} data-pos={pos} className="hero-card absolute inset-0">
                        {front ? (
                          <Link to={`/books/${book.id}`} tabIndex={-1} data-fly-cover="" className="hero-front relative block size-full overflow-hidden rounded-md shadow-[0_40px_70px_-30px_rgb(0_0_0/0.8)]">
                            <BookCover src={book.cover_image_url} title={book.title} alt={h.cover(book.title ?? "")} eager className="size-full" />
                            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.25)_0_2%,rgb(255_255_255/0.18)_3%,transparent_8%),linear-gradient(120deg,rgb(255_255_255/0.14),transparent_45%)]" aria-hidden="true" />
                          </Link>
                        ) : (
                          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setIndex(i)} className="block size-full overflow-hidden rounded-md shadow-[0_24px_40px_-24px_rgb(0_0_0/0.8)]">
                            <BookCover src={book.cover_image_url} title={book.title} className="size-full" />
                          </button>
                        )}
                        {/* mirror image on the floor */}
                        {book.cover_image_url ? (
                          <span className="hero-reflect pointer-events-none absolute inset-x-0 top-full mt-[3px] block h-full overflow-hidden rounded-md" aria-hidden="true">
                            <img src={book.cover_image_url} alt="" aria-hidden="true" draggable={false} className="size-full -scale-y-100 object-cover" />
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {/* the glossy floor line the covers stand on */}
                <span className="pointer-events-none absolute left-1/2 top-[90.4%] block h-px w-[190%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.22),transparent)]" aria-hidden="true" />
                {/* room for the reflection */}
                <div className="aspect-[25/4]" aria-hidden="true" />
              </div>

              {current ? (
                <div className="text-center" aria-live={autoplaying ? "off" : "polite"} aria-atomic="true">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-lapis-muted">
                    {label ?? h.topRated} <span className="ml-1.5 tabular-nums opacity-80">{h.nOfM(index + 1, books.length)}</span>
                  </p>
                  <div key={current.id} className="hero-caption mt-1.5">
                    <p className="truncate font-display text-[1.6rem] leading-tight text-on-lapis">
                      <Link to={`/books/${current.id}`} className="underline-offset-4 hover:underline">
                        {current.title}
                      </Link>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-on-lapis-muted">
                      {h.by(authorNames(current.authors) || h.unknownAuthor)} · <span className="font-semibold tabular-nums text-gold">{h.from(formatMoney(current.price_from_usd, current.price_from_khr, currency))}</span>
                    </p>
                  </div>
                </div>
              ) : null}

              {/* A short description of the current book, then quiet slide controls: a gold timer line between prev / next, and pause. */}
              <div key={`d-${current?.id}`} className="hero-caption mx-auto mt-2.5 min-h-[4.25rem] max-w-sm text-center [animation-delay:80ms]">
                {blurb ? (
                  <p className="line-clamp-3 text-[14.5px] leading-relaxed text-on-lapis-muted">{blurb}</p>
                ) : detail.isPending && current?.id ? (
                  <span className="grid justify-items-center gap-2" aria-hidden="true">
                    <Skeleton className="h-3 w-11/12 bg-on-lapis/10" />
                    <Skeleton className="h-3 w-4/5 bg-on-lapis/10" />
                    <Skeleton className="h-3 w-3/5 bg-on-lapis/10" />
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button type="button" onClick={() => step(-1)} className={iconButton} aria-label={h.prevBook}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="block h-0.5 w-32 overflow-hidden rounded-full bg-on-lapis-muted/25" aria-hidden="true">
                  <span key={`${index}-${autoplaying}`} className="hero-timer block h-full origin-left bg-gold" style={autoplaying ? { animationDuration: `${SLIDE_MS}ms` } : { animation: "none", transform: "scaleX(1)" }} />
                </span>
                <button type="button" onClick={() => step(1)} className={iconButton} aria-label={h.nextBook}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
                {!reduceMotion && books.length > 1 ? (
                  <button type="button" onClick={() => setPaused((p) => !p)} className={iconButton} aria-label={paused ? h.playSlides : h.pauseSlides}>
                    {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
    </div>
  );
}

/** First two sentences of a description as plain text, at most ~220 characters. */
function shortBlurb(text: string | null | undefined) {
  const plain = (text ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return "";
  const sentences = plain.match(/[^.!?។]+[.!?។]+/g) ?? [plain];
  let out = sentences.slice(0, 2).join(" ").trim();
  if (out.length > 220) out = `${out.slice(0, 217).replace(/\s+\S*$/, "")}…`;
  return out;
}
