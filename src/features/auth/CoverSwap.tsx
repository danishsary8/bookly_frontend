import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { catalogApi } from "@/api/endpoints/catalog";
import { useT } from "@/i18n";

/*
 * The sign-in cover panel's carousel: the shop's real best-seller covers stacked in 3D like books on a table
 * (React Bits "Card Swap" idea, rebuilt on Motion). Every few seconds the front book drops away and slides to the
 * back of the pile; the caption below names the book in front. Pauses on hover/focus and with the pause button;
 * ←/→ step through; reduced motion: no autoplay. Shares the home page's catalogue-rows cache, so it costs no extra
 * request after the home page. While covers are loading (or the API is down) cloth boards stand in.
 */

type Shown = { id: string; title: string | null; by: string | null; cover: string | null; tone: string };

const BOARDS: Shown[] = ["#2F5D4A", "#7A2E2A", "#C9A24B", "#4C5378"].map((tone, i) => ({ id: `board-${i}`, title: null, by: null, cover: null, tone }));
const SLIDE_MS = 4200;
const ease = [0.33, 0, 0.15, 1] as const;

const slotStyle = (slot: number, n: number) => ({
  x: slot * 30,
  y: slot * -26,
  z: slot * -80,
  rotateY: -14,
  opacity: slot < 4 ? 1 - slot * 0.14 : 0,
  zIndex: n - slot,
});

export function CoverSwap() {
  const { dict } = useT();
  const s = dict.signin;
  const reduceMotion = useReducedMotion();
  const rows = useQuery({ queryKey: ["catalog", "rows", null], queryFn: () => catalogApi.rows(), staleTime: 15 * 60 * 1000 });
  const source = rows.data?.find((row) => row.id === "best_sellers")?.books ?? rows.data?.[0]?.books ?? [];
  const covers: Shown[] = source
    .filter((book) => book.cover_image_url)
    .slice(0, 5)
    .map((book, i) => ({
      id: String(book.id),
      title: book.title ?? null,
      by: book.authors?.map((author) => author.name).filter(Boolean).join(", ") || null,
      cover: book.cover_image_url ?? null,
      tone: BOARDS[i % BOARDS.length].tone,
    }));
  const books = covers.length >= 2 ? covers : BOARDS;
  const n = books.length;

  const [shift, setShift] = useState(0);
  const [lastMove, setLastMove] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const autoplay = !reduceMotion && !paused && !hovered && !focused;

  const step = (delta: 1 | -1) => {
    setLastMove(delta);
    setShift((value) => value + delta);
  };
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => step(1), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [autoplay]);

  const front = ((shift % n) + n) % n;
  const book = books[front];
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };
  const control =
    "inline-flex size-11 items-center justify-center rounded-full border border-on-lapis-muted/50 text-on-lapis transition-[background-color,transform] duration-150 hover:bg-on-lapis/10 active:scale-95 motion-reduce:active:scale-100";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={s.shelf}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* The pile of covers: decorative, the caption and live text carry the meaning. */}
      <div className="grid min-h-0 flex-1 place-items-center py-6" aria-hidden="true">
        <div className="relative [perspective:1100px]" style={{ width: "min(13.5rem, 26vh)", aspectRatio: "2 / 3" }}>
          {books.map((item, k) => {
            const slot = (((k - shift) % n) + n) % n;
            const leaving = lastMove === 1 && slot === n - 1 && shift > 0;
            const target = slotStyle(slot, n);
            return (
              <motion.div
                key={item.id}
                className="absolute inset-0 overflow-hidden rounded-[5px] shadow-[0_28px_40px_-22px_rgb(0_0_0/0.7),0_2px_6px_rgb(0_0_0/0.25)] [transform-style:preserve-3d]"
                style={{ backgroundColor: item.tone }}
                initial={false}
                animate={
                  leaving && !reduceMotion
                    ? { ...target, y: [0, 360, target.y], x: [0, 0, target.x], zIndex: [n, n, 0], opacity: [1, 1, target.opacity] }
                    : target
                }
                transition={leaving ? { duration: 1.3, ease, times: [0, 0.45, 1] } : { duration: 0.9, ease }}
              >
                {item.cover ? (
                  <img src={item.cover} alt="" loading="eager" decoding="async" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center font-display text-6xl text-gold/80">B</span>
                )}
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.35)_0_3%,rgb(255_255_255/0.22)_4%,transparent_9%),linear-gradient(120deg,rgb(255_255_255/0.2),transparent_42%)]" />
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="min-h-[7.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease }}
            aria-hidden="true"
          >
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              <span className="h-px w-8 bg-gold" />
              {book.title ? s.bestSeller : s.shelfEyebrow}
            </p>
            <p className="mt-3 line-clamp-2 font-display text-[1.75rem] leading-[1.15] text-on-lapis xl:text-[2rem]">
              {book.title ?? dict.splash.tagline}
            </p>
            {book.by ? <p className="mt-1.5 truncate text-sm text-on-lapis-muted">{book.by}</p> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
          {books.map((item, i) => (
            <span key={item.id} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-on-lapis-muted/25">
              {i === front ? (
                <span
                  key={`${shift}-${autoplay}`}
                  className="auth-progress absolute inset-0 origin-left rounded-full bg-gold"
                  style={autoplay ? { animationDuration: `${SLIDE_MS}ms` } : { animation: "none" }}
                />
              ) : null}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} className={control} aria-label={s.prevBook}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} className={control} aria-label={s.nextBook}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          {!reduceMotion ? (
            <button type="button" onClick={() => setPaused((p) => !p)} className={control} aria-label={paused ? s.playQuotes : s.pauseQuotes} aria-pressed={paused}>
              {paused ? <Play className="size-[18px]" aria-hidden="true" /> : <Pause className="size-[18px]" aria-hidden="true" />}
            </button>
          ) : null}
        </div>
      </div>
      <p className="sr-only" aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
        {s.bookN(front + 1, n)} {book.title ? `${book.title}${book.by ? `, ${book.by}` : ""}` : dict.splash.tagline}
      </p>
    </div>
  );
}
