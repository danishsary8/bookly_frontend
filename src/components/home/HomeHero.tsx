import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import BlurText from "@/components/BlurText";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import Carousel from "@/components/Carousel";
import CountUp from "@/components/CountUp";
import { CtaGlare } from "@/components/CtaGlare";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home hero (MASTER §2.1a, §5; pages/home.md): full-bleed lapis band tinted by the current cover (blurred), a
 * BlurText headline, the page's one vermilion CTA (with GlareHover), live
 * catalogue numbers (CountUp) and a cover slideshow: 5.5s autoplay that stops
 * for the pause button, hover, keyboard focus and reduced motion; ←/→ keys,
 * prev/next buttons and an "n of N" label announced when not autoplaying.
 */

type Stat = { label: string; value: number | undefined };

const iconButton =
  "inline-flex size-10 items-center justify-center rounded-full border border-on-lapis-muted/50 text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95";

export function HomeHero({ featured, stats, label }: { featured: BookCard[] | undefined; stats: Stat[]; label?: string }) {
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
  const autoplaying = books.length > 1 && !reduceMotion && !paused && !hovered && !focused;

  useEffect(() => {
    if (!autoplaying) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % books.length), 5500);
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
    <section className="hero-lapis relative isolate overflow-hidden rounded-none" aria-labelledby="home-hero-title">
      {/* The current cover, hugely blurred, tints the band so each slide brings its own colour. */}
      {current?.cover_image_url ? (
        <img
          key={current.id}
          src={current.cover_image_url}
          alt=""
          aria-hidden="true"
          className="hero-wash pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-50 blur-3xl saturate-150"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_70%_at_25%_40%,rgb(20_32_122/0.85),rgb(20_32_122/0.45)_60%,rgb(10_16_60/0.8))]" aria-hidden="true" />

      <div className="mx-auto grid max-w-(--container-shell) grid-cols-1 items-center gap-12 px-6 py-14 lg:min-h-[min(calc(100svh-var(--header-h)-3rem),720px)] lg:grid-cols-12 lg:gap-x-16 lg:px-12 lg:py-16">
        <div className="lg:col-span-7">
          <p className="eyebrow">{h.heroEyebrow}</p>
          <h1 id="home-hero-title" className="type-display mt-4 text-on-lapis">
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
          <p className="mt-5 max-w-xl text-lg leading-[1.6] text-on-lapis-muted">{dict.home.heroSubtitle}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaGlare>
              <Link
                to="/books"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-base font-semibold text-accent-foreground transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97] motion-reduce:active:scale-100"
              >
                {dict.home.browseCatalogue} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CtaGlare>
            <Link
              to="/books?sort=newest"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-on-lapis-muted/70 px-7 text-base font-semibold text-on-lapis backdrop-blur-sm transition-colors duration-150 hover:bg-on-lapis/10"
            >
              {dict.home.newReleases}
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-on-lapis-muted/40 pt-5">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-lapis-muted">{stat.label}</dt>
                <dd className="mt-1.5 font-display text-3xl tabular-nums text-gold">
                  {stat.value === undefined ? <span className="inline-block h-8 w-12 rounded-sm bg-on-lapis/10" aria-hidden="true" /> : <CountUp to={stat.value} duration={1.2} />}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-5">
          {books.length === 0 ? (
            <Skeleton className="mx-auto aspect-[2/3] w-full max-w-[300px] bg-on-lapis/10" />
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
              className="mx-auto w-full max-w-[300px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-8 focus-visible:ring-offset-transparent"
            >
              <div className="relative">
                {/* soft pool of light under the book */}
                <span className="pointer-events-none absolute -bottom-6 left-1/2 h-10 w-4/5 -translate-x-1/2 rounded-[50%] bg-black/45 blur-2xl" aria-hidden="true" />
                <Carousel
                  fluid
                  loop
                  rotate={24}
                  showIndicators={false}
                  index={index}
                  onIndexChange={setIndex}
                  className="aspect-[2/3] rounded-md border-0 bg-surface-2 shadow-[0_40px_70px_-30px_rgb(0_0_0/0.75)]"
                  slides={books.map((book) => (
                    <Link key={book.id} to={`/books/${book.id}`} tabIndex={-1} className="relative block size-full select-none" draggable={false}>
                      <BookCover src={book.cover_image_url} title={book.title} alt={h.cover(book.title ?? "")} className="size-full" />
                      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.25)_0_2%,rgb(255_255_255/0.18)_3%,transparent_8%),linear-gradient(120deg,rgb(255_255_255/0.14),transparent_45%)]" aria-hidden="true" />
                    </Link>
                  ))}
                />
              </div>

              {current ? (
                <div className="mt-8 rounded-2xl border border-on-lapis-muted/25 bg-on-lapis/[0.06] p-4 backdrop-blur-md" aria-live={autoplaying ? "off" : "polite"} aria-atomic="true">
                  <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-on-lapis-muted">
                    <span>{label ?? h.topRated}</span>
                    <span className="tabular-nums">{h.nOfM(index + 1, books.length)}</span>
                  </p>
                  <p className="mt-1.5 truncate font-display text-xl text-on-lapis">
                    <Link to={`/books/${current.id}`} className="underline-offset-4 hover:underline">
                      {current.title}
                    </Link>
                  </p>
                  <p className="mt-0.5 flex items-center justify-between gap-3 text-sm text-on-lapis-muted">
                    <span className="truncate">{h.by(authorNames(current.authors) || h.unknownAuthor)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-gold">{h.from(formatMoney(current.price_from_usd, current.price_from_khr, currency))}</span>
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      {books.map((book, i) => (
                        <span key={book.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-gold" : "w-1.5 bg-on-lapis-muted/50"}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => step(-1)} className={iconButton} aria-label={h.prevBook}>
                        <ChevronLeft className="size-[18px]" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => step(1)} className={iconButton} aria-label={h.nextBook}>
                        <ChevronRight className="size-[18px]" aria-hidden="true" />
                      </button>
                      {!reduceMotion && books.length > 1 ? (
                        <button type="button" onClick={() => setPaused((p) => !p)} className={iconButton} aria-label={paused ? h.playSlides : h.pauseSlides}>
                          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
