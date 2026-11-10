import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
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
 * Home hero (MASTER §2.1a, §5; pages/home.md): an inset lapis card. Left: eyebrow, BlurText headline, search, three
 * popular categories as quiet links and the page's one vermilion CTA. Right: a centred cover stack (current cover in
 * front on a glossy floor, neighbours peeking out on each side), then "n of N", title, author with a gold price chip,
 * a two-line description when the book has one, and the controls: prev, View book (the slide timer
 * runs along its bottom edge), next, pause. Autoplay (4 s) stops for pause, hover, focus, reduced motion, off screen.
 */

const SLIDE_MS = 4000;

const iconButton =
  "inline-flex size-9 items-center justify-center rounded-full border border-on-lapis-muted/40 text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95";

export function HomeHero({ featured, label }: { featured: BookCard[] | undefined; label?: string }) {
  const tree = useQuery(catalogQueries.categoryTree());
  const topCategories = [...(tree.data ?? [])].filter((c) => c.slug && (c.total_books ?? 0) > 0).sort((a, b) => (b.total_books ?? 0) - (a.total_books ?? 0)).slice(0, 3);
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
  const blurb = usefulBlurb(shortBlurb(detail.data?.description), current);
  // The slideshow only runs while the hero is on screen: no slide changes (or image loads) once scrolled past.
  const sectionRef = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const autoplaying = books.length > 1 && !reduceMotion && !paused && !hovered && !focused && onScreen;

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
    <div className="container-shell pb-6 pt-3 sm:pb-8 sm:pt-4">
    <section ref={sectionRef} className="hero-lapis relative isolate overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-40px_rgb(20_32_122/0.6)]" aria-labelledby="home-hero-title">
      {/* The current cover, hugely blurred, tints the band so each slide brings its own colour. */}
      {current?.cover_image_url ? (
        <img
          key={current.id}
          src={current.cover_image_url}
          alt=""
          aria-hidden="true"
          className="hero-wash pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-35 blur-3xl saturate-125"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(20_32_122/0.9)_0%,rgb(20_32_122/0.7)_45%,rgb(24_38_130/0.55)_100%)]" aria-hidden="true" />

      <div className="grid grid-cols-1 items-center gap-12 px-6 py-12 sm:px-10 lg:h-[clamp(580px,calc(100svh-var(--header-h)-2.5rem),860px)] lg:grid-cols-12 lg:gap-x-8 lg:px-14 lg:py-8">
        <div className="lg:col-span-6">
          <p className="eyebrow">{h.heroEyebrow}</p>
          <h1 id="home-hero-title" className="mt-4 font-display text-[clamp(2.4rem,3.9vw,3.4rem)] leading-[1.03] tracking-[-0.02em] text-on-lapis [@media(max-height:820px)]:text-[clamp(2.2rem,3.8vw,3.4rem)]">
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
            <nav aria-label={h.popularCategories} className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 pl-2 text-sm">
              <span className="mr-1 text-on-lapis-muted">{h.popularCategories}:</span>
              {topCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full px-2.5 font-medium text-on-lapis underline decoration-on-lapis-muted/40 underline-offset-4 transition-[background-color,text-decoration-color] hover:bg-on-lapis/10 hover:decoration-gold"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaGlare>
              <Link
                to="/books"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-semibold text-accent-foreground transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97] motion-reduce:active:scale-100"
              >
                {dict.home.browseCatalogue} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CtaGlare>
          </div>
        </div>

        <div className="lg:col-span-6">
          {books.length === 0 ? (
            <div className="mx-auto grid w-full max-w-[440px] justify-items-center gap-4" aria-hidden="true">
              <Skeleton className="aspect-[2/3] w-[min(290px,64%)] bg-on-lapis/10" />
              <Skeleton className="mt-6 h-3 w-1/3 bg-on-lapis/10" />
              <Skeleton className="h-8 w-3/5 bg-on-lapis/10" />
              <Skeleton className="h-4 w-2/5 bg-on-lapis/10" />
              <Skeleton className="h-12 w-4/5 bg-on-lapis/10" />
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
              className="mx-auto w-full max-w-[520px] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-8 focus-visible:ring-offset-transparent"
            >
              {/* The stack: the current cover in front, its neighbours peeking out behind on each side; every cover stands
                  on a glossy floor with a soft mirror image. Click a neighbour to bring it forward. */}
              <div
                onPointerMove={(e) => {
                  if (reduceMotion || e.pointerType !== "mouse") return;
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--tilt-y", `${(((e.clientX - r.left) / r.width) - 0.5) * 12}deg`);
                  e.currentTarget.style.setProperty("--tilt-x", `${(0.5 - (e.clientY - r.top) / r.height) * 8}deg`);
                }}
                onPointerLeave={(e) => {
                  e.currentTarget.style.setProperty("--tilt-y", "0deg");
                  e.currentTarget.style.setProperty("--tilt-x", "0deg");
                }}
                className="hero-stack relative mx-auto w-[min(330px,64%,calc((100svh-var(--header-h)-20rem)*0.56))]"
              >
                <span className="pointer-events-none absolute left-1/2 top-[42%] -z-10 size-[210%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(130_160_255/0.3),transparent)]" aria-hidden="true" />
                <div className="relative aspect-[2/3] [perspective:1400px]">
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
                        {book.cover_image_url ? (
                          <span className="hero-reflect pointer-events-none absolute inset-x-0 top-full mt-[3px] block h-full overflow-hidden rounded-md" aria-hidden="true">
                            <img src={book.cover_image_url} alt="" aria-hidden="true" draggable={false} className="size-full -scale-y-100 object-cover" />
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <span className="pointer-events-none absolute left-1/2 top-[88.2%] block h-px w-[200%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.22),transparent)]" aria-hidden="true" />
                <div className="aspect-[5/1]" aria-hidden="true" />
              </div>

              {current ? (
                <div className="text-center">
                  <div aria-live={autoplaying ? "off" : "polite"} aria-atomic="true">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-lapis-muted">
                      {label ?? h.topRated} <span className="ml-1.5 tabular-nums opacity-80">{h.nOfM(index + 1, books.length)}</span>
                    </p>
                    <div key={current.id} className="hero-caption">
                      <p className="mt-2 truncate font-display text-[clamp(1.6rem,2.1vw,2rem)] leading-tight text-on-lapis">
                        <Link to={`/books/${current.id}`} className="underline-offset-4 hover:underline">
                          {current.title}
                        </Link>
                      </p>
                      <p className="mt-1.5 flex items-center justify-center gap-2.5 text-[15px] text-on-lapis-muted">
                        <span className="truncate">{h.by(authorNames(current.authors) || h.unknownAuthor)}</span>
                        <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-gold/15 px-3 text-sm font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/35">
                          {h.from(formatMoney(current.price_from_usd, current.price_from_khr, currency))}
                        </span>
                      </p>
                      {/* A short description (two lines). Books without one simply show none: the column stays centred. */}
                      {blurb ? (
                        <p className="mx-auto mt-3 line-clamp-2 max-w-md text-[15px] leading-relaxed text-on-lapis/80">{blurb}</p>
                      ) : detail.isPending && current.id ? (
                        <span className="mx-auto mt-4 grid max-w-sm justify-items-center gap-2" aria-hidden="true">
                          <Skeleton className="h-3 w-11/12 bg-on-lapis/10" />
                          <Skeleton className="h-3 w-3/5 bg-on-lapis/10" />
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button type="button" onClick={() => step(-1)} className={iconButton} aria-label={h.prevBook}>
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <Link to={`/books/${current.id}`} className="group/vb relative inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-full border border-on-lapis-muted/45 px-5 text-sm font-semibold text-on-lapis transition-colors hover:bg-on-lapis/10">
                      {h.viewBook} <ArrowRight className="size-4 transition-transform duration-200 group-hover/vb:translate-x-0.5" aria-hidden="true" />
                      {/* the slide timer runs along the bottom edge of the button */}
                      <span className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full" aria-hidden="true">
                        <span key={`${index}-${autoplaying}`} className="hero-timer block h-full origin-left bg-gold" style={autoplaying ? { animationDuration: `${SLIDE_MS}ms` } : { animation: "none", transform: "scaleX(0)" }} />
                      </span>
                    </Link>
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
              ) : null}
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

/** Hide placeholder descriptions that only repeat the title and author ("Moby-Dick by Herman Melville, a classic…"). */
function usefulBlurb(blurb: string, book: BookCard | undefined) {
  if (!blurb || !book?.title) return blurb;
  const norm = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const rest = norm(blurb).replace(norm(book.title), " ").replace(norm(authorNames(book.authors)), " ").replace(/\s+/g, " ").trim();
  // Fewer than about eight words left once the title and author are taken out: nothing worth reading.
  return rest.split(" ").filter(Boolean).length < 8 ? "" : blurb;
}
