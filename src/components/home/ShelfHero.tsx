import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { useAddToCart } from "@/components/catalog/useCatalogActions";
import { ReaderScore } from "@/components/ReaderScore";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home "shelf" section (below the hero; design-system/bookly/pages/home.md): an endless row of real-looking books
 * standing on an oak shelf. Each book is a closed 3D box (spine, front cover, back cover) with its own height and
 * thickness, a spine in its cover's colour, the full title and the author's surname. The book in the middle is pulled
 * out and turned so its cover faces you, tilted a little and leaning towards the cursor.
 * Change book: click a spine, the arrows, a row tab, drag, or ←/→ while the shelf has focus; it also drifts on by itself
 * every few seconds until someone interacts. Click the cover to open the book; Add to cart flies the cover to the cart.
 * The whole section is sized to fit one laptop screen. One rAF loop drives every book (pure CSS 3D, no WebGL), and it
 * stops while the shelf is off screen. Reduced motion: books snap, no autoplay, no tilt, no entrance slide.
 */

type RowId = "best_sellers" | "new_arrivals" | "coming_soon" | "ebook_deals";
const ROWS: RowId[] = ["best_sellers", "new_arrivals", "coming_soon", "ebook_deals"];
const ROW_LINK: Record<RowId, string> = {
  best_sellers: "/books?sort=best_selling",
  new_arrivals: "/books?sort=newest",
  coming_soon: "/books?coming_soon=1&sort=release_soon",
  ebook_deals: "/books?has_ebook=1&format=ebook&max_price=4.99&sort=price_asc",
};
/** Book-cloth colours for spines until (or unless) a cover's own colour can be read. */
const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#C9A24B", "#4C5378", "#8A5A3B", "#1E4E5C", "#5B2A4E", "#E9E1CF", "#A0522D"];
const AUTOPLAY_MS = 3200;
/** The shelf is a framed row (about 13 spines beside the open book), not an edge-to-edge wall. */
const SHELF_MAX = 1180;
const SPINES = 13;

/** light: dark ink on the spine. gold: the gold surname still reaches 4.5:1 on this colour (else cream). */
type Tone = { bg: string; light: boolean; gold: boolean };
type ShelfItem = {
  id: string;
  book: BookCard | null;
  tone: Tone;
  title: string;
  by: string;
  surname: string;
  /** Height and thickness relative to the tallest / thickest book (from the id, so they never change). */
  tall: number;
  thick: number;
};

const smooth = (x: number) => x * x * (3 - 2 * x);
const bump = (r: number) => (Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5);
/** A stable 0–1 number per book. */
const hash01 = (key: string) => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
const luminance = (r: number, g: number, b: number) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/**
 * A spine colour whose ink passes WCAG AA: light colours (L ≥ 0.25) take dark ink; anything darker is deepened until
 * cream ink reaches 4.5:1 (L ≤ 0.15). Gold is kept for the surname only where it also reaches 4.5:1 (L ≤ 0.09).
 */
const toneOf = (r: number, g: number, b: number): Tone => {
  let L = luminance(r, g, b);
  if (L >= 0.25) return { bg: `rgb(${r} ${g} ${b})`, light: true, gold: false };
  while (L > 0.15) {
    [r, g, b] = [r, g, b].map((v) => Math.round(v * 0.92));
    L = luminance(r, g, b);
  }
  return { bg: `rgb(${r} ${g} ${b})`, light: false, gold: L <= 0.09 };
};
const clothTone = (hex: string): Tone => {
  const n = parseInt(hex.slice(1), 16);
  return toneOf(n >> 16, (n >> 8) & 255, n & 255);
};

/**
 * Spine colours read from the covers: a tiny canvas average of each cover, deepened a little like book cloth.
 * Covers served without CORS headers can't be read; those books keep their cloth colour.
 */
function useCoverTones(urls: string[]) {
  const [tones, setTones] = useState<Record<string, Tone>>({});
  const key = urls.join("|");
  useEffect(() => {
    let cancelled = false;
    for (const url of key ? key.split("|") : []) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 6;
          canvas.height = 9;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, 6, 9);
          const data = ctx.getImageData(0, 0, 6, 9).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          const px = data.length / 4;
          // deepen 18% so spines read as cloth, not as a flat swatch of the cover
          [r, g, b] = [r, g, b].map((v) => Math.round((v / px) * 0.82));
          const tone = toneOf(r, g, b);
          setTones((prev) => ({ ...prev, [url]: tone }));
        } catch {
          // tainted canvas (no CORS): keep the cloth colour
        }
      };
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
  }, [key]);
  return tones;
}

export function ShelfHero() {
  const { dict } = useT();
  const h = dict.homePage;
  const rows = useQuery({ queryKey: ["catalog", "rows", null], queryFn: () => catalogApi.rows(), staleTime: 15 * 60 * 1000 });
  const [row, setRow] = useState<RowId>("best_sellers");

  const available = ROWS.filter((id) => (rows.data?.find((r) => r.id === id)?.books.length ?? 0) >= 3);
  const current = available.includes(row) ? row : (available[0] ?? "best_sellers");
  const books = (rows.data?.find((r) => r.id === current)?.books ?? []).slice(0, 12);
  const tones = useCoverTones(books.flatMap((b) => (b.cover_image_url ? [b.cover_image_url] : [])));
  const list = books.length >= 3 ? books : Array.from({ length: 9 }, () => null);
  const items: ShelfItem[] = list.map((book, i) => {
    const id = book ? String(book.id) : `board-${i}`;
    const names = (book?.authors ?? []).map((a) => a.name).filter(Boolean) as string[];
    const seed = hash01(id);
    return {
      id,
      book,
      tone: (book?.cover_image_url && tones[book.cover_image_url]) || clothTone(CLOTH[i % CLOTH.length]),
      title: book?.title ?? "Bookly",
      by: names.join(", "),
      surname: names[0]?.split(" ").filter(Boolean).pop() ?? "Bookly",
      tall: 0.86 + seed * 0.14,
      thick: 0.84 + hash01(`${id}t`) * 0.16,
    };
  });

  return (
    <section aria-labelledby="shelf-title" className="shelf-hero relative overflow-clip [contain:paint]">
      <div className="relative z-10 px-4 pt-6 text-center">
        <p className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px w-10 bg-current" aria-hidden="true" />
          {h.shelfEyebrow}
          <span className="h-px w-10 bg-current" aria-hidden="true" />
        </p>
        <h2 id="shelf-title" className="mt-2 font-display text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight">{h.shelfTitle}</h2>
      </div>

      {/* Row tabs (blue pill behind the active one) and, on the right, a link to the whole list. */}
      <div className="relative z-10 mx-auto mt-4 flex max-w-[1180px] flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 md:justify-between">
        <span className="hidden w-44 md:block" aria-hidden="true" />
        {available.length > 1 ? (
          <nav aria-label={h.browse}>
            <ul className="flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-full border border-border bg-card/70 p-1 backdrop-blur-sm">
              {available.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={id === current}
                    onClick={() => setRow(id)}
                    className={cn(
                      "relative min-h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-300",
                      id === current ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {id === current ? <span className="shelf-tab absolute inset-0 rounded-full bg-primary" aria-hidden="true" /> : null}
                    <span className="relative">{dict.shopExtras.rows[id]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : <span />}
        <Link to={ROW_LINK[current]} className="group/all inline-flex min-h-11 w-44 items-center justify-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline md:justify-end">
          {h.seeAllRow(dict.shopExtras.rows[current])} <ArrowRight className="size-4 transition-transform duration-200 group-hover/all:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Keyed so the shelf starts fresh (centred on the first book, sliding in) whenever the row or its size changes. */}
      <Shelf key={`${current}-${items.length}-${items[0]?.id}`} items={items} row={current} />
    </section>
  );
}

function Shelf({ items, row: current }: { items: ShelfItem[]; row: RowId }) {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const navigate = useNavigate();
  const cart = useAddToCart();
  const reduce = useReducedMotion() ?? false;
  const n = items.length;
  const [dims, setDims] = useState({ H: 340, ws: 58, d: 227, gap: 9, W: 1440 });
  // Enough copies of the list to run past both screen edges at any size (the shelf is endless).
  const copies = Math.max(3, Math.ceil((Math.min(dims.W, SHELF_MAX) + dims.d * 4) / ((dims.ws + dims.gap) * n)) + 1);
  const total = n * copies;

  // Motion state lives in refs; React only renders the caption.
  const stage = useRef<HTMLDivElement>(null);
  const tapes = useRef<(HTMLDivElement | null)[]>([]);
  const centre = useRef(-1);
  const st = useRef({ s: n, T: n, lift: new Float32Array(Math.max(total, 1)), hover: -1, tx: 0, ty: 0, mx: 0, my: 0, dragging: false, interacted: false });
  const [active, setActive] = useState(0);
  const shownIdx = useRef(0);
  const [dir, setDir] = useState(1);

  // Book size from the screen, so heading + tabs + shelf + caption fit one laptop screen under the header.
  useLayoutEffect(() => {
    const measure = () => {
      const H = Math.round(Math.max(190, Math.min((window.innerHeight - 405) / 1.12, window.innerWidth * 0.55, 380)));
      setDims({ H, ws: H * 0.17, d: H * (2 / 3), gap: H * 0.03, W: window.innerWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The animation loop.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let idle = performance.now();
    const { H, ws, d, gap } = dims;
    const half = Math.min(window.innerWidth, SHELF_MAX, SPINES * (ws + gap) + d * 1.4) / 2;
    const loop = (now: number) => {
      const m = st.current;
      if (m.lift.length !== total) m.lift = new Float32Array(total);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce && !m.interacted && !m.dragging && m.hover < 0 && now - idle > AUTOPLAY_MS) {
        m.T = Math.round(m.T) + 1;
        idle = now;
      }
      if (m.interacted) {
        idle = now;
        m.interacted = false;
      }
      // a slower spring than before: the book is taken off the shelf, not snapped out
      const k = reduce ? 60 : m.dragging ? 18 : 4.2;
      m.s += (m.T - m.s) * (1 - Math.exp(-k * dt));
      if (Math.abs(m.T - m.s) < 1e-4) m.s = m.T;
      // keep numbers small on the endless loop
      if (m.s > total * 2) {
        m.s -= total;
        m.T -= total;
      }
      if (m.s < -total) {
        m.s += total;
        m.T += total;
      }
      const settled = Math.abs(m.T - m.s) < 0.3;
      const tyTarget = reduce || !settled ? 0 : m.my;
      const txTarget = reduce || !settled ? 0 : m.mx;
      m.tx += (txTarget - m.tx) * (1 - Math.exp(-7 * dt));
      m.ty += (tyTarget - m.ty) * (1 - Math.exp(-7 * dt));

      for (let v = 0; v < total; v++) {
        const el = tapes.current[v];
        if (!el) continue;
        let r = (((v - m.s) % total) + total) % total;
        if (r > total / 2) r -= total;
        if (Math.abs(r) < 0.5) centre.current = v;
        const x = r * (ws + gap) + (d - ws + 1.6 * gap) * bump(r);
        if (Math.abs(x) > half + d * 1.5) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        const target = m.hover === v && Math.abs(r) > 0.5 ? 1 : 0;
        m.lift[v] += (target - m.lift[v]) * (1 - Math.exp(-12 * dt));
        const o = smooth(Math.max(0, 1 - Math.abs(r)));
        const y = -o * 0.02 * H - m.lift[v] * 0.07 * H;
        // spines further from the middle sit further back, so the shelf curves away like a bookcase seen up close
        const depth = -Math.pow(Math.min(Math.abs(r), 12), 1.35) * 0.11 * H;
        el.style.transform = `translate3d(${x}px, ${y}px, ${o * 0.16 * H + depth}px) rotateZ(${-3 * o}deg) rotateX(${m.ty * 6 * o}deg) rotateY(${-90 * o + m.tx * 9 * o}deg)`;
        el.style.zIndex = String(Math.round(100 - Math.abs(r) * 4));
        el.style.setProperty("--o", o.toFixed(3));
      }
      const idx = ((Math.round(m.s) % n) + n) % n;
      if (idx !== shownIdx.current) {
        shownIdx.current = idx;
        setDir(m.T >= m.s ? 1 : -1);
        setActive(idx);
      }
      frame = visible ? requestAnimationFrame(loop) : 0;
    };
    // Only animate while the shelf is on screen (and the tab is visible): no work at all once scrolled past.
    let visible = true;
    let onScreen = true;
    const resume = () => {
      if (visible && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      visible = onScreen && document.visibilityState === "visible";
      resume();
    });
    if (stage.current) observer?.observe(stage.current);
    const onVisibility = () => {
      visible = onScreen && document.visibilityState === "visible";
      resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dims, n, total, reduce]);

  const go = (delta: number) => {
    const m = st.current;
    m.T = Math.round(m.T) + delta;
    m.interacted = true;
  };
  const relative = (v: number) => {
    const m = st.current;
    let r = (((v - m.T) % total) + total) % total;
    if (r > total / 2) r -= total;
    return r;
  };

  // Drag to scrub.
  const drag = useRef<{ x: number; T: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, T: st.current.T, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = stage.current?.getBoundingClientRect();
    if (rect && e.pointerType === "mouse") {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const onCover = Math.abs(e.clientX - cx) < dims.d * 0.6 && Math.abs(e.clientY - cy) < dims.H * 0.6;
      st.current.mx = onCover ? Math.max(-1, Math.min(1, (e.clientX - cx) / (dims.d * 0.6))) : ((e.clientX - cx) / rect.width) * 0.5;
      st.current.my = onCover ? -Math.max(-1, Math.min(1, (e.clientY - cy) / (dims.H / 2))) : 0;
    }
    const g = drag.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (!g.moved && Math.abs(dx) > 6) {
      g.moved = true;
      st.current.dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (g.moved) {
      st.current.T = g.T - dx / (dims.ws + dims.gap);
      st.current.interacted = true;
    }
  };
  const endDrag = () => {
    const g = drag.current;
    drag.current = null;
    if (g?.moved) {
      st.current.T = Math.round(st.current.T);
      st.current.dragging = false;
      // swallow the click that ends a drag
      window.addEventListener("click", (ev) => ev.stopPropagation(), { capture: true, once: true });
    }
  };
  const onLeave = () => {
    st.current.mx = 0;
    st.current.my = 0;
    st.current.hover = -1;
  };

  const shown = items[active] ?? items[0];
  const book = shown?.book;
  const price = book ? formatMoney(book.price_from_usd, book.price_from_khr, currency) : null;
  const href = book ? `/books/${book.id}` : ROW_LINK[current];
  const { H, ws, d } = dims;
  const stageH = Math.round(H * 1.12 + 44);
  /** The shelf board: its front edge sits just in front of the spines; the floor runs back from there. */
  const front = d / 2 + H * 0.05;
  const width = Math.min(SHELF_MAX, SPINES * (ws + dims.gap) + d * 1.4);
  // Where the lip lands on screen: perspective 2200px from the stage centre, at depth `front`.
  const originY = H * 0.58 + 12;
  const lipScale = 2200 / (2200 - front);
  const lipTop = stageH / 2 + (originY + H / 2 - stageH / 2) * lipScale;

  return (
    <>
      {/* The shelf. */}
      <div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        aria-label={dict.shopExtras.rows[current]}
        aria-describedby="shelf-hint"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
          if (e.key === "Enter" && book) navigate(href);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onLeave}
        className="shelf-stage shelf-enter relative mx-auto mt-3 cursor-grab select-none overflow-hidden peer outline-none [perspective:2200px] [touch-action:pan-y] active:cursor-grabbing"
        style={{ height: stageH, maxWidth: width } as CSSProperties}
      >
        {/* the board's front lip: always the nearest thing, so it is drawn flat on top at its projected place */}
        <div className="shelf-lip pointer-events-none absolute left-1/2 z-[200] -translate-x-1/2" style={{ top: lipTop, width: width * 1.4, height: Math.max(9, H * 0.05 * lipScale) }} aria-hidden="true" />
        <div className="absolute left-1/2 [transform-style:preserve-3d]" style={{ top: originY }} aria-hidden="true">
          {/* the oak shelf: a floor that runs back from the front edge, and the board's front lip */}
          <div className="shelf-floor absolute" style={{ width: width * 1.6, height: H * 2.6, left: -width * 0.8, top: H / 2 - H * 2.6, transformOrigin: "50% 100%", transform: `translateZ(${front}px) rotateX(90deg)` }} />

          {Array.from({ length: total }, (_, v) => {
            const item = items[v % n];
            const bh = H * item.tall;
            const bw = ws * item.thick;
            const bd = bh * (2 / 3);
            const top = H / 2 - bh;
            const long = item.title.length > 16;
            return (
              <div
                key={`${item.id}-${v}`}
                ref={(el) => {
                  tapes.current[v] = el;
                }}
                onPointerEnter={() => {
                  st.current.hover = v;
                }}
                onPointerLeave={() => {
                  if (st.current.hover === v) st.current.hover = -1;
                }}
                onClick={() => {
                  const r = relative(v);
                  if (Math.abs(r) < 0.5) {
                    if (item.book) navigate(`/books/${item.book.id}`);
                  } else go(Math.round(r));
                }}
                className="absolute left-0 top-0 cursor-pointer [transform-style:preserve-3d] will-change-transform"
              >
                {/* contact shadow on the shelf, under the book */}
                <div
                  className="shelf-contact absolute"
                  style={{ width: bw * 2.2, height: bd * 1.15, left: -bw * 1.1, top: H / 2 - (bd * 1.15) / 2, transform: "rotateX(90deg)" }}
                />
                {/* spine (front of the box) */}
                <div
                  className={cn("shelf-face shelf-spine absolute flex flex-col items-center justify-between overflow-hidden rounded-[3px] py-3", item.tone.light ? "text-[#1B1A2E]" : "text-[#F6EFDF]")}
                  style={{ width: bw, height: bh, left: -bw / 2, top, background: item.tone.bg, transform: `translateZ(${bd / 2}px)`, "--shade": "calc(var(--o, 0) * 0.55)" } as CSSProperties}
                >
                  <span className={cn("h-px w-3/5", item.tone.light ? "bg-[#1B1A2E]/45" : "bg-[#E8C766]/70")} />
                  <span
                    className="shelf-title max-h-[64%] overflow-hidden text-center font-display leading-[1.08] [text-orientation:mixed] [writing-mode:vertical-rl]"
                    style={{ fontSize: Math.max(10, bw * (long ? 0.25 : 0.31)), maxWidth: bw * 0.84 }}
                  >
                    {item.title}
                  </span>
                  <span className="grid justify-items-center gap-1.5">
                    <span className={cn("h-px w-3/5", item.tone.light ? "bg-[#1B1A2E]/45" : "bg-[#E8C766]/70")} />
                    <span
                      className={cn("max-h-[5.5em] overflow-hidden whitespace-nowrap font-semibold uppercase tracking-[0.12em] [writing-mode:vertical-rl]", item.tone.light ? "text-[#1B1A2E]" : item.tone.gold ? "text-[#E8C766]" : "text-[#F6EFDF]")}
                      style={{ fontSize: Math.max(8, bw * 0.17) }}
                    >
                      {item.surname}
                    </span>
                  </span>
                </div>
                {/* front cover (right side of the box) */}
                <div
                  className="shelf-face shelf-cover absolute overflow-hidden rounded-[3px] [backface-visibility:hidden]"
                  style={{ width: bd, height: bh, left: -bd / 2, top, background: item.tone.bg, transform: `rotateY(90deg) translateZ(${bw / 2}px)`, "--shade": "calc((1 - var(--o, 0)) * 0.5)", boxShadow: "0 34px 60px -26px rgb(20 16 10 / calc(var(--o, 0) * 0.55))" } as CSSProperties}
                >
                  {item.book?.cover_image_url ? (
                    <img src={item.book.cover_image_url} alt="" draggable={false} loading={v >= n && v < 2 * n ? "eager" : "lazy"} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center p-6 text-center font-display text-2xl leading-tight text-[#F6EFDF]">{item.title}</span>
                  )}
                  {/* spine hinge + gloss */}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.32)_0_2.5%,rgb(255_255_255/0.2)_3.5%,transparent_9%),linear-gradient(115deg,rgb(255_255_255/0.16),transparent_40%)]" />
                </div>
                {/* back cover (left side of the box): books right of the open one show this edge */}
                <div
                  className="shelf-face absolute rounded-[3px] [backface-visibility:hidden]"
                  style={{ width: bd, height: bh, left: -bd / 2, top, background: item.tone.bg, transform: `rotateY(-90deg) translateZ(${bw / 2}px)`, "--shade": 0.35 } as CSSProperties}
                />
                {/* the page block on top, so a book seen from slightly above is closed */}
                <div
                  className="shelf-pages absolute"
                  style={{ width: bw * 0.9, height: bd * 0.97, left: -bw * 0.45, top: top - (bd * 0.97) / 2, transform: "rotateX(90deg)" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption: one compact row — arrows, title and author, rating and price, Add to cart and View book. */}
      <div className="relative z-10 mx-auto mt-1 w-full max-w-[1000px] px-4 pb-8" aria-live="polite">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-2xl border border-border bg-card/80 p-2.5 shadow-[0_18px_40px_-30px_rgb(20_32_122/0.45)] backdrop-blur-sm md:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] md:gap-x-5 md:p-3 md:pl-3">
          <button type="button" onClick={() => go(-1)} aria-label={h.prevBook} className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition-[background-color,transform] hover:bg-muted active:scale-95">
            <ArrowLeft className="size-[18px]" aria-hidden="true" />
          </button>
          <div className="min-w-0 overflow-hidden text-center md:text-left">
            <p key={`t-${shown?.id}`} className={cn("shelf-roll truncate font-display text-[clamp(1.15rem,1.7vw,1.45rem)] leading-tight text-foreground", dir < 0 && "shelf-roll-down")}>
              {shown?.book ? shown.title : dict.splash.tagline}
            </p>
            <p key={`a-${shown?.id}`} className={cn("shelf-roll mt-0.5 truncate text-[13px] font-medium uppercase tracking-[0.12em] text-primary [animation-delay:60ms]", dir < 0 && "shelf-roll-down")}>
              {shown?.book ? (shown.by ? h.by(shown.by) : h.unknownAuthor) : dict.shopExtras.rows[current]}
            </p>
          </div>
          <button type="button" onClick={() => go(1)} aria-label={h.nextBook} className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition-[background-color,transform] hover:bg-muted active:scale-95 md:order-last">
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </button>
          <div className="col-span-3 flex items-center justify-center gap-3 md:col-span-1 md:justify-end">
            {book ? <ReaderScore book={book} className="hidden text-[13px] sm:inline-flex" /> : null}
            {price ? <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{price}</span> : null}
          </div>
          <div className="col-span-3 flex items-center justify-center gap-2 md:col-span-1">
            {book && book.in_stock !== false ? (
              <button
                type="button"
                onClick={() => {
                  const img = centre.current >= 0 ? tapes.current[centre.current]?.querySelector<HTMLImageElement>(".shelf-cover img") : null;
                  cart.add(book, undefined, undefined, { from: img ?? null });
                }}
                disabled={cart.pendingBookId === book.id}
                className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-70"
              >
                <ShoppingBag className="size-4" aria-hidden="true" /> {h.addToCart}
              </button>
            ) : null}
            <Link to={href} className="inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              {book ? h.viewBook : dict.shopExtras.viewAll}
            </Link>
          </div>
        </div>
        {/* For screen readers always; shown on screen only while the shelf has keyboard focus. */}
        <p id="shelf-hint" className="shelf-hint mt-2 text-center text-xs text-muted-foreground">{h.shelfHint}</p>
      </div>
    </>
  );
}
