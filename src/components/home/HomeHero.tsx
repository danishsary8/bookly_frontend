import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, QrCode, Wallet } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import BlurText from "@/components/BlurText";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { useQuery } from "@tanstack/react-query";
import { catalogQueries } from "@/api/endpoints/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home hero (MASTER §2.1a, §5; pages/home.md): an inset lapis card. Left: eyebrow, BlurText headline, search, three
 * popular categories as quiet links and the page's one vermilion CTA. Right: a centred cover stack (current cover in
 * front on a glossy floor, neighbours peeking out on each side), then "n of N", title, author with a gold price chip,
 * and the controls: prev, View book (the slide timer runs along its bottom edge), next, pause. No description (owner
 * 2026-11-11): the cover gets that room instead. Autoplay (4 s) stops for pause, hover, focus, reduced motion, off screen.
 */

const SLIDE_MS = 4000;

const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-on-lapis-muted/40 text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold";

export function HomeHero({ featured, label }: { featured: BookCard[] | undefined; label?: string }) {
  const tree = useQuery({ ...catalogQueries.categoryTree(), enabled: featured !== undefined });
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
      {!reduceMotion && books.length > 1 ? (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className={`${iconButton} absolute right-3 top-3 z-30 backdrop-blur-sm sm:right-6 sm:top-6`}
          style={{ backgroundColor: "var(--lapis)" }}
          aria-label={paused ? h.playSlides : h.pauseSlides}
          aria-pressed={paused}
        >
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
        </button>
      ) : null}
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

      <div className="grid grid-cols-1 items-center gap-12 px-6 pb-12 pt-16 sm:px-10 sm:py-12 [--hero-panel-height:min(920px,calc(100svh-var(--header-h)-4rem))] lg:h-[var(--hero-panel-height)] lg:grid-cols-12 lg:gap-x-8 lg:px-14 lg:py-6 short:py-5">
        <div className="relative z-10 lg:col-span-6">
          <p className="eyebrow">{h.heroEyebrow}</p>
          <h1 id="home-hero-title" className="mt-6 font-display text-[clamp(2.4rem,3.9vw,3.4rem)] leading-[1.12] tracking-[-0.02em] text-on-lapis short:mt-4 short:text-[clamp(2rem,3.4vw,3rem)]">
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
          <p className="mt-5 max-w-[44ch] text-[17px] leading-[1.7] text-on-lapis-muted short:mt-4 short:text-base">{dict.home.heroSubtitle}</p>


          {topCategories.length ? (
            <nav aria-label={h.popularCategories} className="mt-8 flex flex-wrap items-center gap-3 text-sm short:mt-6">
              <span className="w-full text-[13px] text-on-lapis-muted sm:mr-1 sm:w-auto">{h.popularCategories}</span>
              {topCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-on-lapis/[0.07] px-4 py-2 font-medium text-on-lapis ring-1 ring-inset ring-on-lapis/15 transition-[background-color,box-shadow] duration-200 hover:bg-on-lapis/[0.14] hover:ring-gold/50"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}
          {/* One calm call to action (cream on lapis, the arrow in its own lapis disc) and the shop's two promises. */}
          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 short:mt-6">
              <Link
                to="/books"
                className="hero-catalogue-cta relative isolate inline-flex h-[3.25rem] shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap rounded-full bg-[#FBF6EC] py-1.5 pl-6 pr-1.5 text-[15px] font-semibold leading-none text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                <span className="relative">{dict.home.browseCatalogue}</span>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            <ul className="grid gap-2 text-[13px] leading-5 text-on-lapis-muted">
              <li className="inline-flex items-center gap-2"><Wallet className="size-4 text-gold" aria-hidden="true" /> {h.cod}</li>
              <li className="inline-flex items-center gap-2"><QrCode className="size-4 text-gold" aria-hidden="true" /> {h.khqr}</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-6">
          {books.length === 0 ? (
            <div className="home-loading-hero mx-auto grid w-full max-w-[440px] justify-items-center gap-4" aria-hidden="true">
              <Skeleton className="aspect-[2/3] w-[min(240px,60%)] bg-on-lapis/10 lg:w-[min(280px,60%,calc((var(--hero-panel-height)-14rem)*0.6))]" />
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
              className="mx-auto w-full max-w-[520px] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-8 focus-visible:ring-offset-transparent lg:translate-y-2"
            >
              {/* The stack: the current cover in front, its neighbours peeking out behind on each side; every cover stands
                  on a glossy floor with a soft mirror image. Click a neighbour to bring it forward. */}
              <div className="relative isolate">
                {books.length > 1 ? <>
                  <button type="button" onClick={() => step(-1)} className={`${iconButton} absolute left-0 top-[43%] z-20 -translate-y-1/2 shadow-lg backdrop-blur-sm hover:border-gold/60`} style={{ backgroundColor: "var(--lapis)" }} aria-label={h.prevBook}>
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => step(1)} className={`${iconButton} absolute right-0 top-[43%] z-20 -translate-y-1/2 shadow-lg backdrop-blur-sm hover:border-gold/60`} style={{ backgroundColor: "var(--lapis)" }} aria-label={h.nextBook}>
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </> : null}
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
                className="hero-stack relative mx-auto w-[min(300px,60%)] lg:w-[min(340px,60%,calc((var(--hero-panel-height)-14rem)*0.6))]"
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
                <span className="pointer-events-none absolute left-1/2 top-[90%] block h-px w-[200%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.22),transparent)]" aria-hidden="true" />
                <div className="aspect-[6/1]" aria-hidden="true" />
              </div>
              </div>

              {current ? (
                <div className="text-center">
                  <div aria-live={autoplaying ? "off" : "polite"} aria-atomic="true">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-lapis-muted">
                      {label ?? h.topRated} <span className="ml-1.5 tabular-nums opacity-80">{h.nOfM(index + 1, books.length)}</span>
                    </p>
                    <div key={current.id} className="hero-caption">
                      <p className="mx-auto mt-2 line-clamp-2 max-w-[30ch] text-balance font-display text-[clamp(1.25rem,1.5vw,1.5rem)] leading-[1.2] text-on-lapis">
                        <Link to={`/books/${current.id}`} className="underline-offset-4 hover:underline">
                          {current.title}
                        </Link>
                      </p>
                      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-sm text-on-lapis-muted">
                        <span className="min-w-0 max-w-full truncate">{h.by(authorNames(current.authors) || h.unknownAuthor)}</span>
                        <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-gold/15 px-3 text-sm font-semibold tabular-nums text-gold ring-1 ring-inset ring-gold/35">
                          {h.from(formatMoney(current.price_from_usd, current.price_from_khr, currency))}
                        </span>
                        {current.low_stock_remaining ? (
                          <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[#FF8A6E]/15 px-3 text-sm font-semibold text-[#FFB09A] ring-1 ring-inset ring-[#FF8A6E]/40">
                            <span className="size-1.5 animate-pulse rounded-full bg-[#FFB09A] motion-reduce:animate-none" aria-hidden="true" />
                            {dict.cards.onlyLeft(current.low_stock_remaining)}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Link to={`/books/${current.id}`} className="group/vb relative inline-flex h-11 min-w-36 items-center justify-center gap-3 overflow-hidden rounded-full border border-on-lapis-muted/40 bg-on-lapis/5 px-6 text-sm font-semibold text-on-lapis transition-colors hover:border-on-lapis-muted/70 hover:bg-on-lapis/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                      {h.viewBook} <ArrowRight className="size-4 transition-transform duration-200 group-hover/vb:translate-x-0.5" aria-hidden="true" />
                      {/* the slide timer runs along the bottom edge of the button */}
                      <span className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full" aria-hidden="true">
                        <span key={`${index}-${autoplaying}`} className="hero-timer block h-full origin-left bg-gold" style={autoplaying ? { animationDuration: `${SLIDE_MS}ms` } : { animation: "none", transform: "scaleX(0)" }} />
                      </span>
                    </Link>
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
