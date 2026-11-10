import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home "shelf" section (below the hero): an endless shelf of books standing spine-out on warm paper. The book in the middle is pulled out and
 * turned in 3D so its cover faces you, tilted a little and leaning towards the cursor (design-system/bookly/pages/home.md).
 * Change book: click a spine, the arrows, a row tab, drag, or ←/→ while the shelf has focus; it also drifts on by
 * itself every few seconds until someone interacts. Click the cover to open the book.
 * One rAF loop drives every book (pure CSS 3D, no WebGL). Reduced motion: books snap, no autoplay, no tilt.
 */

type RowId = "best_sellers" | "new_arrivals" | "coming_soon" | "ebook_deals";
const ROWS: RowId[] = ["best_sellers", "new_arrivals", "coming_soon", "ebook_deals"];
const ROW_LINK: Record<RowId, string> = {
  best_sellers: "/books?sort=best_selling",
  new_arrivals: "/books?sort=newest",
  coming_soon: "/books?coming_soon=1&sort=release_soon",
  ebook_deals: "/books?has_ebook=1&format=ebook&max_price=4.99&sort=price_asc",
};
/** Book-cloth colours for spines (and for covers while real ones load). */
const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#C9A24B", "#4C5378", "#8A5A3B", "#1E4E5C", "#5B2A4E", "#E9E1CF", "#A0522D"];
/** Light cloths get dark ink on the spine, dark ones cream ink. */
const LIGHT_CLOTH = new Set(["#C9A24B", "#E9E1CF"]);
const AUTOPLAY_MS = 3000;
/** The shelf is a framed row (about 13 spines beside the open book), not an edge-to-edge wall. */
const SHELF_MAX = 1180;
/** Spines shown beside the open book. */
const SPINES = 13;

type Shelf = { id: string; book: BookCard | null; cloth: string; title: string; by: string };

const smooth = (x: number) => x * x * (3 - 2 * x);
const bump = (r: number) => (Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5);

export function ShelfHero() {
  const { dict } = useT();
  const h = dict.homePage;
  const rows = useQuery({ queryKey: ["catalog", "rows", null], queryFn: () => catalogApi.rows(), staleTime: 15 * 60 * 1000 });
  const [row, setRow] = useState<RowId>("best_sellers");

  const available = ROWS.filter((id) => (rows.data?.find((r) => r.id === id)?.books.length ?? 0) >= 3);
  const current = available.includes(row) ? row : (available[0] ?? "best_sellers");
  const books = (rows.data?.find((r) => r.id === current)?.books ?? []).slice(0, 12);
  const list = books.length >= 3 ? books : Array.from({ length: 9 }, () => null);
  const items: Shelf[] = list.map((book, i) => ({
    id: book ? String(book.id) : `board-${i}`,
    book,
    cloth: CLOTH[i % CLOTH.length],
    title: book?.title ?? "Bookly",
    by: book?.authors?.map((a) => a.name).filter(Boolean).join(", ") ?? "",
  }));

  return (
    <section aria-labelledby="shelf-title" className="shelf-hero relative overflow-clip [contain:paint]">
      <div className="relative z-10 px-4 pt-10 text-center">
        <p className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px w-10 bg-current" aria-hidden="true" />
          {h.shelfEyebrow}
          <span className="h-px w-10 bg-current" aria-hidden="true" />
        </p>
        <h2 id="shelf-title" className="mt-2 font-display text-[clamp(1.75rem,3vw,2.4rem)] leading-tight">{h.shelfTitle}</h2>
      </div>

      {/* Row tabs with a blue pill behind the active one. */}
      {available.length > 1 ? (
        <nav aria-label={h.browse} className="relative z-10 mx-auto flex w-max max-w-full justify-center px-4 pt-5">
          <ul className="flex overflow-x-auto rounded-full border border-border bg-card/70 p-1 backdrop-blur-sm">
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
      ) : null}

      {/* Keyed so the shelf starts fresh (centred on the first book) whenever the row or its size changes. */}
      <Shelf key={`${current}-${items.length}-${items[0]?.id}`} items={items} row={current} />
    </section>
  );
}

function Shelf({ items, row: current }: { items: Shelf[]; row: RowId }) {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const n = items.length;
  const [dims, setDims] = useState({ H: 360, ws: 56, d: 240, gap: 10, W: 1440 });
  // Enough copies of the list to run past both screen edges at any size (the shelf is endless).
  const copies = Math.max(3, Math.ceil((Math.min(dims.W, SHELF_MAX) + dims.d * 4) / ((dims.ws + dims.gap) * n)) + 1);
  const total = n * copies;

  // Motion state lives in refs; React only renders the caption.
  const stage = useRef<HTMLDivElement>(null);
  const tapes = useRef<(HTMLDivElement | null)[]>([]);
  const st = useRef({ s: n, T: n, lift: new Float32Array(Math.max(total, 1)), hover: -1, tx: 0, ty: 0, mx: 0, my: 0, dragging: false, interacted: false });
  const [active, setActive] = useState(0);
  const shownIdx = useRef(0);
  const [dir, setDir] = useState(1);

  // Book size follows the hero height.
  useLayoutEffect(() => {
    const measure = () => {
      // Sized so the whole section (heading, tabs, shelf, caption) fits one screen under the header.
      const H = Math.max(230, Math.min(window.innerHeight - 580, window.innerWidth * 0.3, 400));
      setDims({ H, ws: H * 0.17, d: H * (2 / 3), gap: H * 0.034, W: window.innerWidth });
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
      const k = reduce ? 60 : m.dragging ? 18 : 5.2;
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
        const x = r * (ws + gap) + (d - ws + 1.6 * gap) * bump(r);
        if (Math.abs(x) > half + d * 1.5) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        const target = m.hover === v && Math.abs(r) > 0.5 ? 1 : 0;
        m.lift[v] += (target - m.lift[v]) * (1 - Math.exp(-12 * dt));
        const o = smooth(Math.max(0, 1 - Math.abs(r)));
        const y = -o * 0.025 * H - m.lift[v] * 0.11 * H;
        // spines further from the middle sit further back, so the shelf curves away like a bookcase seen up close
        const depth = -Math.pow(Math.min(Math.abs(r), 12), 1.35) * 0.11 * H;
        el.style.transform = `translate3d(${x}px, ${y}px, ${o * 0.18 * H + depth}px) rotateZ(${-3.5 * o}deg) rotateX(${m.ty * 6 * o}deg) rotateY(${-90 * o + m.tx * 9 * o}deg)`;
        el.style.zIndex = String(Math.round(100 - Math.abs(r) * 4));
        el.style.setProperty("--o", o.toFixed(3));
      }
      const idx = ((Math.round(m.s) % n) + n) % n;
      if (idx !== shownIdx.current) {
        shownIdx.current = idx;
        setDir(m.T >= m.s ? 1 : -1);
        setActive(idx);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
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
      st.current.mx = onCover ? Math.max(-1, Math.min(1, (e.clientX - cx) / (dims.d * 0.6))) : (e.clientX - cx) / rect.width * 0.5;
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

  return (
    <>
      {/* The shelf. */}
      <div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        aria-label={dict.shopExtras.rows[current]}
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
        className="shelf-stage relative mx-auto mt-4 cursor-grab select-none overflow-hidden peer outline-none [perspective:2200px] [touch-action:pan-y] active:cursor-grabbing"
        style={{ height: H + 90, maxWidth: Math.min(SHELF_MAX, SPINES * (ws + dims.gap) + d * 1.4) } as CSSProperties}
      >
        {/* soft floor shadow under the shelf */}
        <span
          className="pointer-events-none absolute left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(20_32_122/0.22),transparent)] blur-md"
          style={{ top: (H + 90) / 2 + H / 2 - 6 }}
          aria-hidden="true"
        />
        <div className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]" aria-hidden="true">
          {Array.from({ length: total }, (_, v) => {
            const item = items[v % n];
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
                {/* spine (front of the box) */}
                <div
                  className={cn("shelf-face absolute flex flex-col items-center justify-between overflow-hidden rounded-[3px] py-3 [backface-visibility:hidden]", LIGHT_CLOTH.has(item.cloth) ? "text-[#1B1A2E]" : "text-[#F6EFDF]")}
                  style={{ width: ws, height: H, left: -ws / 2, top: -H / 2, background: item.cloth, transform: `translateZ(${d / 2}px)`, "--shade": "calc(var(--o, 0) * 0.55)" } as CSSProperties}
                >
                  <span className="h-px w-3/5 bg-[#E8C766]/70" />
                  <span className="line-clamp-1 max-h-[70%] font-display leading-none [text-orientation:mixed] [writing-mode:vertical-rl]" style={{ fontSize: Math.max(11, ws * 0.32) }}>
                    {item.title}
                  </span>
                  <span className="grid justify-items-center gap-1.5">
                    <span className="h-px w-3/5 bg-[#E8C766]/70" />
                    <span className="font-display text-[#E8C766]" style={{ fontSize: Math.max(10, ws * 0.3) }}>B</span>
                  </span>
                </div>
                {/* cover (right side of the box) */}
                <div
                  className="shelf-face absolute overflow-hidden rounded-[3px] [backface-visibility:hidden]"
                  style={{ width: d, height: H, left: -d / 2, top: -H / 2, background: item.cloth, transform: `rotateY(90deg) translateZ(${ws / 2}px)`, "--shade": "calc((1 - var(--o, 0)) * 0.5)", boxShadow: "0 34px 60px -26px rgb(20 16 10 / calc(var(--o, 0) * 0.6))" } as CSSProperties}
                >
                  {item.book?.cover_image_url ? (
                    <img src={item.book.cover_image_url} alt="" draggable={false} loading={v >= n && v < 2 * n ? "eager" : "lazy"} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center p-6 text-center font-display text-2xl leading-tight text-[#F6EFDF]">{item.title}</span>
                  )}
                  {/* spine hinge + gloss */}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.32)_0_2.5%,rgb(255_255_255/0.2)_3.5%,transparent_9%),linear-gradient(115deg,rgb(255_255_255/0.16),transparent_40%)]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption: rolls through a mask whenever the book changes. */}
      <div className="group/cap relative z-10 mx-auto mt-1 grid w-full max-w-2xl justify-items-center gap-2.5 px-4 pb-9 text-center" aria-live="polite">
        <div className="flex w-full items-center justify-between gap-4">
          <button type="button" onClick={() => go(-1)} aria-label={h.prevBook} className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,transform] hover:bg-muted active:scale-95">
            <ArrowLeft className="size-[18px]" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p key={`t-${shown?.id}`} className={cn("shelf-roll truncate font-display text-[clamp(1.4rem,2.4vw,2rem)] leading-tight text-foreground", dir < 0 && "shelf-roll-down")}>
              {shown?.book ? shown.title : dict.splash.tagline}
            </p>
          </div>
          <button type="button" onClick={() => go(1)} aria-label={h.nextBook} className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,transform] hover:bg-muted active:scale-95">
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-hidden">
          <p key={`a-${shown?.id}`} className={cn("shelf-roll text-sm font-medium uppercase tracking-[0.14em] text-primary [animation-delay:60ms]", dir < 0 && "shelf-roll-down")}>
            {shown?.book ? (shown.by ? h.by(shown.by) : h.unknownAuthor) : dict.shopExtras.rows[current]}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          {price ? <span className="text-lg font-semibold tabular-nums">{h.from(price)}</span> : null}
          <Link to={href} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98]">
            {book ? h.viewBook : dict.shopExtras.viewAll}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to={ROW_LINK[current]} className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
            {dict.shopExtras.viewAll}
          </Link>
        </div>
        {/* The hint doubles as the keyboard-focus cue for the shelf (no ring across the page). */}
        <p className="text-xs text-muted-foreground transition-colors shelf-hint">{h.shelfHint}</p>
      </div>
    </>
  );
}
