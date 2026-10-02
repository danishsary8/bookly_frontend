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

/*
 * Home hero (MASTER §2.1a, §5): lapis panel (full-bleed band at night) with a
 * BlurText headline, the page's one vermilion CTA (with GlareHover), live
 * catalogue numbers (CountUp) and a cover slideshow: 5.5s autoplay that stops
 * for the pause button, hover, keyboard focus and reduced motion; ←/→ keys,
 * prev/next buttons and an "n of N" label announced when not autoplaying.
 */

type Stat = { label: string; value: number | undefined };

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-lg border border-on-lapis-muted text-on-lapis transition-colors duration-150 hover:bg-on-lapis/10";

export function HomeHero({ featured, stats }: { featured: BookCard[] | undefined; stats: Stat[] }) {
  const currency = useCurrency();
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
    <section className="hero-lapis dark:ml-[calc(50%-50vw)] dark:w-screen" aria-labelledby="home-hero-title">
      <div className="mx-auto grid max-w-(--container-shell) grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-12 lg:gap-x-16 lg:px-12 lg:py-16">
        <div className="lg:col-span-7">
          <p className="eyebrow">Bookly · Phnom Penh</p>
          <h1 id="home-hero-title" className="type-display mt-4 text-on-lapis">
            <BlurText
              as="span"
              text="Stories for every mood, delivered to your door"
              delay={60}
              animateBy="words"
              animationFrom={{ filter: "blur(8px)", opacity: 0, y: 24 }}
              animationTo={[{ filter: "blur(0px)", opacity: 1, y: 0 }]}
              stepDuration={0.7}
              easing={[0.16, 1, 0.3, 1]}
            />
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-[1.6] text-on-lapis-muted">
            Classics, new releases and series to binge, in print or digital. Prices in dollars or riel, cash on delivery across Cambodia.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaGlare>
              <Link
                to="/books"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-accent-foreground transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97] motion-reduce:active:scale-100"
              >
                Browse books <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CtaGlare>
            <Link
              to="/books?sort=newest"
              className="inline-flex h-12 items-center gap-2 rounded-lg border border-on-lapis-muted px-6 text-base font-semibold text-on-lapis transition-colors duration-150 hover:bg-on-lapis/10"
            >
              New arrivals
            </Link>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-on-lapis-muted/70 pt-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-on-lapis-muted">{stat.label}</dt>
                <dd className="mt-2 text-3xl font-semibold tabular-nums text-gold">
                  {stat.value === undefined ? <span className="inline-block h-8 w-12 rounded-sm bg-on-lapis/10" aria-hidden="true" /> : <CountUp to={stat.value} duration={1.2} />}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-5">
          {books.length === 0 ? (
            <Skeleton className="mx-auto aspect-[2/3] w-full max-w-[280px] bg-on-lapis/10" />
          ) : (
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label="Top rated books"
              tabIndex={0}
              onKeyDown={onKeyDown}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onFocus={() => setFocused(true)}
              onBlur={onBlur}
              className="mx-auto w-full max-w-[280px] rounded-lg"
            >
              <Carousel
                fluid
                loop
                rotate={24}
                showIndicators={false}
                index={index}
                onIndexChange={setIndex}
                className="aspect-[2/3] rounded-sm border-0 bg-surface-2 shadow-overlay"
                slides={books.map((book) => (
                  <Link key={book.id} to={`/books/${book.id}`} tabIndex={-1} className="block size-full select-none" draggable={false}>
                    <BookCover src={book.cover_image_url} title={book.title} alt={`${book.title} cover`} className="size-full" />
                  </Link>
                ))}
              />

              <div className="mt-8 flex items-center justify-between gap-2">
                <button type="button" onClick={() => step(-1)} className={iconButton} aria-label="Previous book">
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2" aria-hidden="true">
                  {books.map((book, i) => (
                    <span key={book.id} className={`h-2 rounded-full transition-all duration-200 ${i === index ? "w-6 bg-gold" : "w-2 bg-on-lapis-muted/50"}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => step(1)} className={iconButton} aria-label="Next book">
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                  {!reduceMotion && books.length > 1 ? (
                    <button type="button" onClick={() => setPaused((p) => !p)} className={iconButton} aria-label={paused ? "Play slideshow" : "Pause slideshow"}>
                      {paused ? <Play className="size-5" aria-hidden="true" /> : <Pause className="size-5" aria-hidden="true" />}
                    </button>
                  ) : null}
                </div>
              </div>

              {current ? (
                <div className="mt-3 text-center" aria-live={autoplaying ? "off" : "polite"} aria-atomic="true">
                  <p className="text-sm font-medium text-on-lapis">
                    <span className="tabular-nums text-on-lapis-muted">
                      {index + 1} of {books.length}
                    </span>
                    <span className="text-on-lapis-muted" aria-hidden="true">
                      {" "}·{" "}
                    </span>
                    <Link to={`/books/${current.id}`} className="underline-offset-4 hover:underline">
                      {current.title}
                    </Link>
                  </p>
                  <p className="text-sm text-on-lapis-muted">
                    by {authorNames(current.authors) || "Unknown author"} ·{" "}
                    <span className="font-semibold tabular-nums text-gold">from {formatMoney(current.price_from_usd, current.price_from_khr, currency)}</span>
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
