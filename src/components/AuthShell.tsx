import { useEffect, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Carousel from "./Carousel";

/*
 * Shared frame for Sign in / Create account / Forgot password / Reset password.
 * A clean single-column form; at ≥1024px a lapis side panel (MASTER §2.1a surface,
 * §5 quote-carousel pattern) sits beside it. The panel is decorative context, so the
 * page's <h1> always lives in the form column.
 */

const QUOTES = [
  { text: "There is no Frigate like a Book / To take us Lands away.", author: "Emily Dickinson" },
  { text: "I have always imagined that Paradise will be a kind of library.", author: "Jorge Luis Borges" },
  { text: "A room without books is like a body without a soul.", author: "Attributed to Cicero" },
];

const SLIDE_MS = 5500;

const QuotePanel = () => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const autoplay = !reduceMotion && !paused && !hovered && !focused;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [autoplay]);

  const step = (delta: number) => setIndex((i) => (i + delta + QUOTES.length) % QUOTES.length);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  const controlClass =
    "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-on-lapis-muted text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95 motion-reduce:active:scale-100";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Words on reading"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      {/* Visual carousel only; loop clones would read twice, so assistive tech gets the
          live text below (always the current quote) instead. */}
      <div aria-hidden="true">
      <Carousel
        fluid
        loop
        rotate={0}
        showIndicators={false}
        index={index}
        onIndexChange={setIndex}
        className="min-h-[15rem] rounded-none border-0 bg-transparent"
        slides={QUOTES.map((quote) => (
          <figure key={quote.author} className="flex h-full select-none flex-col justify-end">
            <blockquote className="font-display text-[2rem] leading-[1.15] text-on-lapis xl:text-[2.45rem]">
              “{quote.text}”
            </blockquote>
            <figcaption className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-gold">{quote.author}</figcaption>
          </figure>
        ))}
      />
      </div>

      <div className="mt-8 flex items-center gap-2">
        <button type="button" onClick={() => step(-1)} className={controlClass} aria-label="Previous quote">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="mx-2 flex items-center gap-2" aria-hidden="true">
          {QUOTES.map((quote, i) => (
            <span key={quote.author} className={`h-2 rounded-full transition-all duration-200 ${i === index ? "w-6 bg-gold" : "w-2 bg-on-lapis-muted/50"}`} />
          ))}
        </div>
        <button type="button" onClick={() => step(1)} className={controlClass} aria-label="Next quote">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {!reduceMotion ? (
          <button type="button" onClick={() => setPaused((p) => !p)} className={controlClass} aria-label={paused ? "Play quotes" : "Pause quotes"} aria-pressed={paused}>
            {paused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      <p className="sr-only" aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
        Quote {index + 1} of {QUOTES.length}: {QUOTES[index].text}, {QUOTES[index].author}
      </p>
    </div>
  );
};

const Wordmark = ({ onLapis = false }: { onLapis?: boolean }) => {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 rounded-lg transition-opacity duration-150 hover:opacity-80" aria-label="Bookly home">
      <span className={`grid h-9 w-9 place-items-center rounded-md ${onLapis ? "bg-on-lapis text-lapis" : "bg-primary text-primary-foreground"}`}>
        <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className={`font-display text-xl leading-tight ${onLapis ? "text-on-lapis" : "text-primary"}`}>Bookly</span>
    </Link>
  );
};

interface AuthShellProps {
  children: ReactNode;
}

export const AuthShell = ({ children }: AuthShellProps) => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto grid min-h-screen max-w-[1280px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:p-6">
      <aside className="hero-lapis hidden flex-col justify-between p-10 lg:flex xl:p-12">
        <Wordmark onLapis />
        <QuotePanel />
      </aside>

      <main id="content" tabIndex={-1} className="flex flex-col px-4 py-6 sm:px-6 lg:py-10">
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <span className="lg:hidden"><Wordmark /></span>
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to store
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  </div>
);
