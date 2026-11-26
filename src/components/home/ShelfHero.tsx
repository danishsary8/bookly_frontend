import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { catalogApi, catalogQueries, type BookFilters } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { useAddToCart } from "@/components/catalog/useCatalogActions";
import { ReaderScore } from "@/components/ReaderScore";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home "shelf" section (below the hero; design-system/bookly/pages/home.md): an endless row of real-looking books
 * standing on an oak shelf. Each book is a closed 3D box (spine, front cover, back cover), all the same height with a
 * slightly different thickness, a spine in its cover's colour, the full title and the author's surname. The book in the middle is pulled
 * out and turned so its cover faces you, tilted a little and leaning towards the cursor.
 * Change book: click a spine, the arrows, a row tab, drag, or ←/→ while the shelf has focus; it also drifts on by itself
 * every few seconds until someone interacts. The row stands in a wooden bookcase: back panel, uprights, top board, and
 * the rail below as its base. Click the cover or View book to open the book.
 * The whole section is sized to fit one laptop screen. One rAF loop drives every book (pure CSS 3D, no WebGL), and it
 * stops while the shelf is off screen. Reduced motion: books snap, no autoplay, no tilt, no row lift, no pill glide.
 *
 * Motion pass (owner 2026-11-16): the bookcase never remounts. Changing the row works like a library lift: the board
 * with its books slides out of the case and the next row rises into place and settles (transforms only, on the
 * compositor). The blue tab pill glides and stretches between tabs.
 *
 * Classic look (owner 2026-11-17): the titled spines are back (title, author surname, and one of three bindings:
 * gold rules, a leather title label, or raised bands). Every book has the same height and thickness with a small gap
 * between them, so a book turning out of the row never cuts into its neighbours.
 */

// Owner 2026-11-26: New arrivals left the shelf (it has its own section below); Khmer books come last, after Ebooks.
type RowId = "best_sellers" | "coming_soon" | "education" | "ebook_deals" | "khmer";
const ROWS: RowId[] = ["best_sellers", "coming_soon", "education", "ebook_deals", "khmer"];
const ROW_LINK: Record<RowId, string> = {
  best_sellers: "/books?sort=best_selling",
  education: "/categories/education",
  khmer: "/categories/khmer-books",
  coming_soon: "/books?coming_soon=1&sort=release_soon",
  ebook_deals: "/books?has_ebook=1&format=ebook",
};
/** Book-cloth colours for spines until (or unless) a cover's own colour can be read. */
const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#C9A24B", "#4C5378", "#8A5A3B", "#1E4E5C", "#5B2A4E", "#E9E1CF", "#A0522D"];
/** The shelf takes the next book every 3 s (owner 2026-11-16). */
const AUTOPLAY_MS = 3000;
/** A slightly wider shelf with slimmer cloth spines around the open book. */
const SHELF_MAX = 1520;
const VISIBLE_SPINES = 24;
const SHELF_BOOKS = 30;
const ROW_FILTERS: Record<RowId, BookFilters> = {
  best_sellers: { sort: "best_selling" },
  education: { sort: "newest" },
  khmer: { sort: "best_selling" },
  coming_soon: { coming_soon: true, sort: "release_soon" },
  ebook_deals: { has_ebook: true, format: "ebook" },
};
/** The bookcase frame: thickness of the top board and of each upright, in px. */
const CASE_TOP = 18;
const CASE_POST = 16;

/** light: a pale cloth (dark tooling); gold: kept for compatibility with the colour reader. */
type Tone = { bg: string; light: boolean; gold: boolean };
/** Three classic bindings: gold rules, a leather title label, or raised bands across the spine. */
const BINDINGS = ["rules", "label", "bands"] as const;
type Binding = (typeof BINDINGS)[number];
type ShelfItem = {
  id: string;
  book: BookCard | null;
  tone: Tone;
  title: string;
  by: string;
  surname: string;
  /** One shelf, one edition size: every book is the same height and thickness (1). */
  tall: number;
  thick: number;
  binding: Binding;
};

/** A small stable hash of the id: picks each book's cloth colour and binding. */
const hashOf = (id: string) => {
  let h = [...id].reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 0x01000193) >>> 0, 0x811c9dc5);
  // final mix (murmur3 fmix32), so short ids like "12" and "13" still land far apart
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/** True when a book belongs to the Khmer shelf or carries a Khmer-script title. */
const KHMER_SCRIPT_RE = /[\u1780-\u17FF]/;
const isKhmerSpine = (row: RowId | "loading", item: ShelfItem) =>
  row === "khmer" || KHMER_SCRIPT_RE.test(item.title) || item.book?.language?.toLowerCase() === "khmer";

/** Artisanal gold-tooled Khmer heritage spine ornament (replaces cramped vertical Khmer text). */
function KhmerSpineArt({ binding }: { binding: Binding }) {
  if (binding === "label") {
    // Royal framed cartouche with a centered Romduol / lotus diamond rosette
    return (
      <span className="shelf-khmer-cartouche" aria-hidden="true">
        <svg viewBox="0 0 28 112" fill="none" className="shelf-khmer-svg">
          <path d="M5 10 L14 4 L23 10" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <path d="M5 102 L14 108 L23 102" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="14" y1="14" x2="14" y2="38" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
          <line x1="14" y1="74" x2="14" y2="98" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
          <circle cx="14" cy="24" r="1.4" fill="currentColor" opacity="0.75" />
          <circle cx="14" cy="88" r="1.4" fill="currentColor" opacity="0.75" />
          <path d="M14 40 L22 56 L14 72 L6 56 Z" stroke="currentColor" strokeWidth="1.2" opacity="0.95" />
          <path d="M14 45.5 L18.8 56 L14 66.5 L9.2 56 Z" stroke="currentColor" strokeWidth="0.85" opacity="0.65" />
          <path d="M14 51 L16.4 56 L14 61 L11.6 56 Z" fill="currentColor" opacity="0.9" />
          <circle cx="14" cy="36" r="1.2" fill="currentColor" opacity="0.85" />
          <circle cx="14" cy="76" r="1.2" fill="currentColor" opacity="0.85" />
        </svg>
      </span>
    );
  }
  if (binding === "bands") {
    // Classic compartmented heritage spine with a crisp 4-petal lotus emblem
    return (
      <span className="shelf-khmer-core" aria-hidden="true">
        <svg viewBox="0 0 28 84" fill="none" className="shelf-khmer-svg">
          <path d="M14 8 L17 13 L14 18 L11 13 Z" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="14" y1="21" x2="14" y2="28" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
          <path d="M14 30 C16.5 35 19 38.5 23 42 C19 45.5 16.5 49 14 54 C11.5 49 9 45.5 5 42 C9 38.5 11.5 35 14 30 Z" stroke="currentColor" strokeWidth="1.2" opacity="0.95" />
          <circle cx="14" cy="42" r="2.6" fill="currentColor" opacity="0.9" />
          <circle cx="14" cy="42" r="5.5" stroke="currentColor" strokeWidth="0.8" opacity="0.45" />
          <line x1="14" y1="56" x2="14" y2="63" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
          <path d="M14 66 L17 71 L14 76 L11 71 Z" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        </svg>
      </span>
    );
  }
  // Minimalist editorial gold-framed spine with slender lotus spire
  return (
    <span className="shelf-khmer-frame" aria-hidden="true">
      <svg viewBox="0 0 28 116" fill="none" className="shelf-khmer-svg">
        <rect x="4" y="4" width="20" height="108" rx="1.5" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
        <line x1="8" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="0.9" opacity="0.65" />
        <line x1="8" y1="102" x2="20" y2="102" stroke="currentColor" strokeWidth="0.9" opacity="0.65" />
        <line x1="14" y1="22" x2="14" y2="43" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
        <line x1="14" y1="73" x2="14" y2="94" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
        <path d="M14 45 L20.5 58 L14 71 L7.5 58 Z" stroke="currentColor" strokeWidth="1.2" opacity="0.95" />
        <circle cx="14" cy="58" r="2.2" fill="currentColor" opacity="0.9" />
        <circle cx="14" cy="20" r="1.3" fill="currentColor" opacity="0.75" />
        <circle cx="14" cy="96" r="1.3" fill="currentColor" opacity="0.75" />
      </svg>
    </span>
  );
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const bump = (r: number) => (Math.abs(r) < 1 ? (r + Math.sin(Math.PI * r) / Math.PI) / 2 : Math.sign(r) * 0.5);
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
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["catalog", "rows", null], queryFn: () => catalogApi.rows(), staleTime: 15 * 60 * 1000 });
  // The compact /catalog/rows preview decides which tabs exist; the shelf itself waits for the full list (no swap from
  // the short preview to the long list, which used to make the row jump twice).
  const [row, setRow] = useState<RowId>("best_sellers");
  const tree = useQuery(catalogQueries.categoryTree());
  const education = tree.data?.find((category) => category.slug === "education");
  // Khmer books: the "Khmer books" category with its sub-categories, shown once it has at least 3 books.
  const khmer = tree.data?.find((category) => category.slug === "khmer-books");
  const categoryRow = (id: RowId) => (id === "education" ? education : id === "khmer" ? khmer : undefined);
  const educationId = education?.id;
  const khmerId = khmer?.id;
  const filtersOf = (id: RowId): BookFilters => ({
    ...ROW_FILTERS[id],
    ...(id === "education" ? { category_id: educationId } : id === "khmer" ? { category_id: khmerId } : {}),
    per_page: SHELF_BOOKS,
  });
  const selectedBooks = useQuery({
    ...catalogQueries.books(filtersOf(row)),
    enabled: (row !== "education" && row !== "khmer") || Boolean(categoryRow(row)?.id),
    placeholderData: undefined,
  });
  /** Fetch a row before it is chosen (hover, focus, and once the shelf is idle), so the lift never waits. */
  const prefetch = (id: RowId) => {
    if ((id === "education" && !educationId) || (id === "khmer" && !khmerId)) return;
    void queryClient.prefetchQuery({ ...catalogQueries.books(filtersOf(id)), staleTime: 15 * 60 * 1000 });
  };

  const previewOf = (id: RowId) => rows.data?.find((r) => r.id === id)?.books ?? [];
  const available = ROWS.filter((id) =>
    id === "education" ? Boolean(education?.id) : id === "khmer" ? (khmer?.total_books ?? 0) >= 3 : previewOf(id).length >= 3,
  );
  const current = available.includes(row) || rows.isPending ? row : (available[0] ?? "best_sellers");
  const loaded = selectedBooks.data?.data;
  const books = loaded ?? [];
  const tones = useCoverTones(books.flatMap((b) => (b.cover_image_url ? [b.cover_image_url] : [])));

  useEffect(() => {
    if (!loaded) return;
    const idle = window.setTimeout(() => available.forEach((id) => id !== current && prefetch(id)), 1500);
    return () => window.clearTimeout(idle);
    // once per row: the other rows are fetched quietly after the first one is on the shelf
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(loaded), current]);

  const make = (book: BookCard | null, i: number): ShelfItem => {
    const id = book ? String(book.id) : `board-${i}`;
    const hash = hashOf(id);
    const names = (book?.authors ?? []).map((a) => a.name).filter(Boolean) as string[];
    return {
      id,
      book,
      tone: (book?.cover_image_url && tones[book.cover_image_url]) || clothTone(CLOTH[(book ? hash : i) % CLOTH.length]),
      title: book?.title ?? "Bookly",
      by: names.join(", "),
      surname: names[0]?.split(" ").filter(Boolean).pop() ?? "Bookly",
      tall: 1,
      thick: 1,
      binding: BINDINGS[(hash >>> 11) % BINDINGS.length],
    };
  };
  // null = this row is still loading (the case shows the old row until the new one is ready to rise in).
  const items: ShelfItem[] | null = loaded ? (books.length >= 3 ? books : Array.from({ length: 9 }, () => null)).map(make) : null;

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

      {/* Row tabs (a blue pill glides between them). The link to the whole list sits under the shelf (owner 2026-11-16). */}
      <div className="relative z-10 mx-auto mt-3 flex max-w-[1440px] justify-center px-4 sm:mt-4">
        {available.length > 1 ? (
          <ShelfTabs
            label={h.browse}
            tabs={available.map((id) => ({ id, label: dict.shopExtras.rows[id] }))}
            current={current}
            onPick={setRow}
            onPeek={prefetch}
          />
        ) : null}
      </div>

      {/* One shelf for the whole visit: rows change inside it (lift out, rise in), it never remounts. */}
      <Shelf items={items} row={current} order={available.indexOf(current)} placeholder={Array.from({ length: 9 }, (_, i) => make(null, i))} />

      {/* "See all <row>": a clear button centred under the bookcase, so the next step after browsing is obvious. */}
      <div className="relative z-10 flex justify-center px-4 pb-10">
        <Link
          to={ROW_LINK[current]}
          className="shelf-all group/all inline-flex min-h-12 items-center gap-3 rounded-full bg-primary py-1.5 pl-6 pr-1.5 text-[15px] font-semibold text-primary-foreground shadow-[0_14px_30px_-14px_rgb(20_32_122/0.7)] outline-none transition-[transform,box-shadow,background-color] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--primary)_84%,#fff)] hover:shadow-[0_18px_34px_-14px_rgb(20_32_122/0.8)] active:translate-y-0 active:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {h.seeAllRow(dict.shopExtras.rows[current])}
          <span className="grid size-9 place-items-center rounded-full bg-[#FBF6EC] text-primary">
            <ArrowRight className="size-4 transition-transform duration-200 group-hover/all:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}

/**
 * The row tabs: one blue pill under the active tab that glides to the next one. Its two edges move at different
 * speeds (the leading edge first), so the pill stretches towards the new tab and gathers there instead of jumping.
 * Reduced motion: the pill moves at once.
 */
function ShelfTabs({ label, tabs, current, onPick, onPeek }: { label: string; tabs: Array<{ id: RowId; label: string }>; current: RowId; onPick: (id: RowId) => void; onPeek: (id: RowId) => void }) {
  const list = useRef<HTMLUListElement>(null);
  const buttons = useRef(new Map<RowId, HTMLButtonElement>());
  const [pill, setPill] = useState<{ l: number; r: number; dir: number; ready: boolean } | null>(null);
  const last = useRef<number | null>(null);

  useLayoutEffect(() => {
    const measure = (animate: boolean) => {
      const ul = list.current;
      const btn = buttons.current.get(current);
      if (!ul || !btn) return;
      // positions inside the (scrollable) tab strip: the button's box relative to the strip's content
      const box = btn.getBoundingClientRect();
      const strip = ul.getBoundingClientRect();
      const l = box.left - strip.left - ul.clientLeft + ul.scrollLeft;
      // `right` on an absolute child of a scrolling box counts from the box's visible (client) edge, not the end of
      // its scrolled content, so phones where the tabs scroll sideways need clientWidth here.
      const r = ul.clientWidth - (l + box.width);
      const first = last.current === null;
      const dir = first ? 0 : Math.sign(l - (last.current ?? l));
      last.current = l;
      setPill((prev) => ({ l, r, dir: animate ? dir : 0, ready: animate && prev !== null }));
      // keep the chosen tab in view when the tabs scroll sideways on small phones (the strip only, never the page)
      if (animate && !first) {
        const end = l + box.width;
        if (l < ul.scrollLeft || end > ul.scrollLeft + ul.clientWidth) ul.scrollTo({ left: Math.max(0, l - 16), behavior: "smooth" });
      }
    };
    measure(true);
    // Re-measure when any tab changes size (web fonts arriving, language change, text zoom), not only the strip.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => measure(false));
    if (list.current) ro?.observe(list.current);
    buttons.current.forEach((btn) => ro?.observe(btn));
    let alive = true;
    void document.fonts?.ready.then(() => alive && measure(false));
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [current, tabs.length]);

  return (
    <nav aria-label={label}>
      <ul ref={list} className="shelf-tabs no-scrollbar relative flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-full border border-border bg-card/70 p-1 backdrop-blur-sm">
        {pill ? (
          <li
            aria-hidden="true"
            className="shelf-pill pointer-events-none absolute inset-y-1 rounded-full bg-primary"
            data-dir={pill.dir > 0 ? "right" : pill.dir < 0 ? "left" : undefined}
            data-ready={pill.ready || undefined}
            style={{ left: pill.l, right: pill.r }}
          />
        ) : null}
        {tabs.map((tab) => (
          <li key={tab.id} className="relative">
            <button
              ref={(el) => {
                if (el) buttons.current.set(tab.id, el);
                else buttons.current.delete(tab.id);
              }}
              type="button"
              aria-pressed={tab.id === current}
              onClick={() => onPick(tab.id)}
              onPointerEnter={() => onPeek(tab.id)}
              onFocus={() => onPeek(tab.id)}
              className={cn(
                "shelf-tab-label relative min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold lg:min-h-9",
                tab.id === current ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                // before the pill is measured, the active tab paints its own background
                tab.id === current && !pill && "bg-primary",
              )}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type Shown = { items: ShelfItem[]; row: RowId | "loading" };
const sameIds = (a: ShelfItem[], b: ShelfItem[]) => a.length === b.length && a.every((item, i) => item.id === b[i].id);

/**
 * The bookcase with one row of books. `items` is null while the chosen row loads. When the row changes the case stays
 * put and the row is swapped like a library lift: out (420 ms, ease-in) towards the top for a tab to the right (towards
 * the bottom for one to the left), then the new row rises in from the other side (680 ms, ease-out) and settles with a
 * 4px landing. Only `translate` is animated (on the compositor). Changing rows again mid-lift queues the latest one.
 */
function Shelf({ items, row: current, order, placeholder }: { items: ShelfItem[] | null; row: RowId; order: number; placeholder: ShelfItem[] }) {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const cart = useAddToCart();
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;

  // What is on the shelf now. The rows the parent asks for wait in `wanted` until the lift can take them.
  const [shown, setShown] = useState<Shown>(() => (items ? { items, row: current } : { items: placeholder, row: "loading" }));
  // Same row and the same books: take the latest props (cover colours arrive after the books).
  const live = items && shown.row === current && sameIds(items, shown.items) ? items : shown.items;
  const n = live.length;
  const [dims, setDims] = useState({ H: 340, ws: 48, d: 227, gap: 8.5, W: 1440 });
  const { H, ws, d, gap } = dims;
  // Each book's place along the row: equal books with a small gap, so a book turning out never cuts into its neighbours.
  const widths = live.map((item) => ws * item.thick);
  const cum = [0];
  for (const w of widths) cum.push(cum[cum.length - 1] + w + gap);
  const period = cum[n];
  const meanW = period / Math.max(1, n);
  // Enough copies of the list to run past both screen edges at any size (the shelf is endless).
  const copies = Math.max(3, Math.ceil((Math.min(dims.W, SHELF_MAX) + d * 4) / Math.max(1, period)) + 1);
  const total = n * copies;

  // Motion state lives in refs; React only renders the caption.
  const stage = useRef<HTMLDivElement>(null);
  const unit = useRef<HTMLDivElement>(null);
  const lip = useRef<HTMLDivElement>(null);
  const tapes = useRef<(HTMLDivElement | null)[]>([]);
  /** True while a row is lifting out or rising in (no autoplay then). */
  const lifting = useRef(false);
  const st = useRef({ s: n, T: n, lift: new Float32Array(Math.max(total, 1)), hover: -1, tx: 0, ty: 0, mx: 0, my: 0, dragging: false, interacted: false });
  const [active, setActive] = useState(0);
  // Pause / play (like the hero's slideshow button): the loop reads the ref, the button shows the state.
  const [shelfPaused, setShelfPaused] = useState(false);
  const pausedRef = useRef(false);
  /** The flat "View" chip over the open book's cover (placed each frame from the cover's on-screen box). */
  useEffect(() => {
    pausedRef.current = shelfPaused;
  }, [shelfPaused]);
  const shownIdx = useRef(0);
  const [dir, setDir] = useState(1);
  const geo = useRef({ cum, period, widths, n, total, meanW, gap, d, H, reduce, lipScale: 1 });

  // Book size from the screen, so heading + tabs + shelf + caption fit one laptop screen under the header.
  useLayoutEffect(() => {
    const measure = () => {
      const H = Math.round(Math.max(190, Math.min((window.innerHeight - 440) / 1.12, window.innerWidth * 0.55, 380)));
      setDims({ H, ws: H * 0.14, d: H * (2 / 3), gap: H * 0.025, W: window.innerWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /** Centre of book `x` (a real number: a book index, or a position between two books) along the endless row. */
  const centreAt = (x: number) => {
    const g = geo.current;
    const f = Math.floor(x);
    const q = Math.floor(f / g.n);
    const i = f - q * g.n;
    const pos = q * g.period + g.cum[i] + (x - f) * (g.widths[i] + g.gap);
    return pos + g.widths[i] / 2;
  };

  /** Writes every book's transform for the current state (the loop calls it each frame; a row swap calls it once). */
  const paint = useRef<(dt: number) => void>(() => {});
  const paintFrame = (dt: number) => {
    const m = st.current;
    const g = geo.current;
    const { d, H, reduce } = g;
    if (m.lift.length !== g.total) m.lift = new Float32Array(g.total);
    const half = Math.min(window.innerWidth - 32, SHELF_MAX, VISIBLE_SPINES * g.meanW + d * 1.4) / 2;
    const settled = Math.abs(m.T - m.s) < 0.3;
    m.tx += ((reduce || !settled ? 0 : m.mx) - m.tx) * (1 - Math.exp(-7 * dt));
    m.ty += ((reduce || !settled ? 0 : m.my) - m.ty) * (1 - Math.exp(-7 * dt));
    const here = centreAt(m.s);
    for (let v = 0; v < g.total; v++) {
      const el = tapes.current[v];
      if (!el) continue;
      let r = (((v - m.s) % g.total) + g.total) % g.total;
      if (r > g.total / 2) r -= g.total;
      const x = centreAt(m.s + r) - here + (d - g.meanW + 1.6 * g.gap) * bump(r);
      // Books past the stage's ends are not drawn at all (no stray faces at the edges).
      if (Math.abs(x) > half + d * 0.6) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      const target = m.hover === v && Math.abs(r) > 0.5 ? 1 : 0;
      m.lift[v] += (target - m.lift[v]) * (1 - Math.exp(-12 * dt));
      const o = smooth(Math.max(0, 1 - Math.abs(r)));
      const y = -o * 0.02 * H - m.lift[v] * 0.07 * H;
      el.style.transform = `translate3d(${x}px, ${y}px, ${o * 0.16 * H}px) rotateX(${m.ty * 6 * o}deg) rotateY(${-90 * o + m.tx * 9 * o}deg)`;
      el.style.zIndex = String(Math.round(100 - Math.abs(r) * 4));
      el.style.setProperty("--o", o.toFixed(3));
    }
    const idx = ((Math.round(m.s) % g.n) + g.n) % g.n;
    if (idx !== shownIdx.current) {
      shownIdx.current = idx;
      setDir(m.T >= m.s ? 1 : -1);
      setActive(idx);
    }
  };

  // Keep the refs the loop and the lift read in step with this render (before any other layout effect runs).
  const lipScaleNow = 2200 / (2200 - (d / 2 + H * 0.05));
  useLayoutEffect(() => {
    geo.current = { cum, period, widths, n, total, meanW, gap, d, H, reduce, lipScale: lipScaleNow };
    paint.current = paintFrame;
    wanted.current = { items, row: current, order };
    shownRow.current = shown.row;
  });

  // The animation loop.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let idle = performance.now();
    const loop = (now: number) => {
      const m = st.current;
      const total = geo.current.total;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce && !pausedRef.current && !lifting.current && !m.interacted && !m.dragging && m.hover < 0 && now - idle > AUTOPLAY_MS) {
        m.T = Math.round(m.T) + 1;
        idle = now;
      }
      if (m.interacted) {
        idle = now;
        m.interacted = false;
      }
      // a slow spring: the book is taken off the shelf, not snapped out
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
      paint.current(dt);
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
  }, [reduce]);

  // ---- The library lift --------------------------------------------------------------------------------------------
  const wanted = useRef<{ items: ShelfItem[] | null; row: RowId; order: number }>({ items, row: current, order });
  const lastOrder = useRef(order);
  const travel = useRef(1);
  const phase = useRef<"idle" | "out" | "empty" | "in">("idle");
  const pendingIn = useRef(false);
  const shownRow = useRef(shown.row);

  /** Moves the row (board, books and the board's front lip) to `to` px; the lip is nearer, so it moves a little more. */
  const shift = (from: number, to: number, ms: number, easing: string, settle = false) => {
    const lipScale = geo.current.lipScale;
    const frames = (k: number) =>
      settle
        ? [{ transform: `translate3d(0, ${from * k}px, 0)` }, { transform: `translate3d(0, ${-4 * k}px, 0)`, offset: 0.82 }, { transform: "translate3d(0, 0, 0)" }]
        : [{ transform: `translate3d(0, ${from * k}px, 0)` }, { transform: `translate3d(0, ${to * k}px, 0)` }];
    // Same path and timing as before, as a GPU transform: iOS Safari flickered animating the `translate` property on the
    // preserve-3d row (iPhone 13 Pro Max, 2026-11-17). Older finished lifts are dropped once the new one has started, so
    // filled animations never pile up on the row.
    // no Web Animations (old browsers, test DOMs): the row simply swaps
    const move = (el: HTMLDivElement | null, k: number) => {
      if (typeof el?.animate !== "function") return undefined;
      const before = typeof el.getAnimations === "function" ? el.getAnimations() : [];
      const run = el.animate(frames(k), { duration: ms, easing, fill: "forwards" });
      before.forEach((a) => a.cancel());
      return run;
    };
    const runs = [move(unit.current, 1), move(lip.current, lipScale)];
    return Promise.all(runs.map((a) => a?.finished.catch(() => undefined)));
  };
  const distance = () => (stage.current?.clientHeight ?? 400) + H * 0.25;

  const swapIn = () => {
    const w = wanted.current;
    if (!w.items) {
      phase.current = "empty";
      return;
    }
    const m = st.current;
    m.s = w.items.length;
    m.T = w.items.length;
    m.hover = -1;
    shownIdx.current = 0;
    setActive(0);
    setDir(1);
    pendingIn.current = true;
    phase.current = "in";
    setShown({ items: w.items, row: w.row });
  };
  const liftOut = () => {
    if (reduce) {
      swapIn();
      return;
    }
    lifting.current = true;
    phase.current = "out";
    const D = distance() * travel.current;
    void shift(0, -D, 420, "cubic-bezier(0.55, 0, 0.8, 0.25)").then(() => {
      if (phase.current === "out") swapIn();
    });
  };

  // The parent chose a row (or its books arrived).
  useEffect(() => {
    if (current !== shownRow.current && order !== lastOrder.current) {
      // a tab to the right sends the row up and brings the next one from below; to the left, the other way round
      travel.current = order > lastOrder.current ? 1 : -1;
      lastOrder.current = order;
    }
    if (phase.current === "idle" && items && current !== shownRow.current) liftOut();
    else if (phase.current === "empty" && items) swapIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, items === null, order]);

  // After a swap rendered: place the new books, then let the row rise in and land.
  useLayoutEffect(() => {
    if (!pendingIn.current) return;
    pendingIn.current = false;
    paint.current(0);
    const done = () => {
      lifting.current = false;
      phase.current = "idle";
      // someone picked another row during the lift: take that one now
      const w = wanted.current;
      if (w.row !== shownRow.current && w.items) liftOut();
    };
    if (reduce) {
      for (const el of [unit.current, lip.current]) if (typeof el?.getAnimations === "function") el.getAnimations().forEach((a) => a.cancel());
      done();
      return;
    }
    const D = distance() * travel.current;
    void shift(D, 0, 680, "cubic-bezier(0.16, 1, 0.3, 1)", true).then(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const go = (delta: number) => {
    const m = st.current;
    m.T = Math.round(m.T) + delta;
    m.interacted = true;
  };
  const relative = (v: number) => {
    const m = st.current;
    const total = geo.current.total;
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
      const onCover = Math.abs(e.clientX - cx) < d * 0.6 && Math.abs(e.clientY - cy) < H * 0.6;
      st.current.mx = onCover ? Math.max(-1, Math.min(1, (e.clientX - cx) / (d * 0.6))) : ((e.clientX - cx) / rect.width) * 0.5;
      st.current.my = onCover ? -Math.max(-1, Math.min(1, (e.clientY - cy) / (H / 2))) : 0;
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
      st.current.T = g.T - dx / (meanW + gap);
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

  const shown0 = live[active] ?? live[0];
  const book = shown0?.book;
  const captionRow = shown.row === "loading" ? current : shown.row;
  const price = book ? formatMoney(book.price_from_usd, book.price_from_khr, currency) : null;
  const href = book ? `/books/${book.id}` : ROW_LINK[captionRow];
  const stageH = Math.round(H * 1.12 + 44);
  /** The shelf board: its front edge sits just in front of the spines; the floor runs back from there. */
  const front = d / 2 + H * 0.05;
  const width = Math.min(SHELF_MAX, VISIBLE_SPINES * meanW + d * 1.4);
  // Where the lip lands on screen: perspective 2200px from the stage centre, at depth `front`.
  // The bookcase (owner 2026-11-12): a top board and two uprights frame the row; the case ends at the shelf's lip, and
  // the rail below is its base. The eye stays where it was (viewY), so the books look the same as before.
  const viewY = stageH / 2 + CASE_TOP;
  const originY = H * 0.58 + 12 + CASE_TOP;
  const lipScale = 2200 / (2200 - front);
  const lipTop = viewY + (originY + H / 2 - viewY) * lipScale;
  const lipH = Math.max(9, H * 0.05 * lipScale);
  const caseH = Math.ceil(lipTop + lipH);

  return (
    <>
      {/* Pause / play, like the hero slideshow's button: tucked inside the bookcase's top-right corner on mobile so the
          row tabs sit close above the case; lifted level with the centred row tabs at the top-right edge on sm+ screens. */}
      {!reduce ? (
        <div className="pointer-events-none relative z-20 mx-auto h-0" style={{ width: "calc(100% - 2rem)", maxWidth: width }}>
          <button
            type="button"
            onClick={() => setShelfPaused((value) => !value)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={shelfPaused ? h.playShelf : h.pauseShelf}
            aria-pressed={shelfPaused}
            title={shelfPaused ? h.playShelf : h.pauseShelf}
            className="shelf-knob shelf-pause pointer-events-auto absolute top-[34px] right-[24px] sm:top-auto sm:bottom-1.5 sm:right-0"
          >
            {shelfPaused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
      ) : null}
      {/* The shelf. */}
      <div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        aria-label={dict.shopExtras.rows[captionRow]}
        aria-describedby="shelf-hint"
        aria-busy={items === null || undefined}
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
        className="shelf-stage relative z-0 mx-auto mt-2 cursor-grab select-none overflow-hidden rounded-t-lg peer outline-none [perspective:2200px] [touch-action:pan-y] active:cursor-grabbing sm:mt-3"
        style={{ height: caseH, width: "calc(100% - 2rem)", maxWidth: width, perspectiveOrigin: `50% ${viewY}px` } as CSSProperties}
      >
        {/* the case: back panel behind the books; top board and uprights (with the shade they cast) in front */}
        <div className="shelf-back pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="shelf-light pointer-events-none absolute inset-0 z-[190]" aria-hidden="true" />
        <div className="shelf-under pointer-events-none absolute inset-x-0 z-[206]" style={{ top: CASE_TOP, height: 14 }} aria-hidden="true" />
        <div className="shelf-side pointer-events-none absolute inset-y-0 z-[204]" style={{ left: CASE_POST, width: 14 }} aria-hidden="true" />
        <div className="shelf-side shelf-side-right pointer-events-none absolute inset-y-0 z-[204]" style={{ right: CASE_POST, width: 14 }} aria-hidden="true" />
        <div className="shelf-post pointer-events-none absolute inset-y-0 left-0 z-[205]" style={{ width: CASE_POST }} aria-hidden="true" />
        <div className="shelf-post shelf-post-right pointer-events-none absolute inset-y-0 right-0 z-[205]" style={{ width: CASE_POST }} aria-hidden="true" />
        <div className="shelf-top pointer-events-none absolute inset-x-0 top-0 z-[210]" style={{ height: CASE_TOP }} aria-hidden="true" />
        {/* the board's front lip: always the nearest thing, so it is drawn flat on top at its projected place */}
        <div ref={lip} className="shelf-lip pointer-events-none absolute inset-x-0 z-[200]" style={{ top: lipTop, height: lipH }} aria-hidden="true" />
        <div ref={unit} className="absolute left-1/2 [transform-style:preserve-3d]" style={{ top: originY }} aria-hidden="true">
          {/* the oak shelf: a floor that runs back from the front edge */}
          <div className="shelf-floor absolute" style={{ width: width * 1.6, height: H * 2.6, left: -width * 0.8, top: H / 2 - H * 2.6, transformOrigin: "50% 100%", transform: `translateZ(${front}px) rotateX(90deg)` }} />

          {Array.from({ length: total }, (_, v) => {
            const item = live[v % n];
            const bh = H * item.tall;
            const bw = widths[v % n];
            const bd = H * (2 / 3) * (0.9 + item.tall * 0.1);
            const top = H / 2 - bh;
            // Keep subtitles on the paper label; the narrow spine carries a clean single-line main title.
            const rawMain = item.title.split(/\s*[:(–—-]\s+/)[0].trim() || item.title.trim();
            const maxChars = item.binding === "label" ? 20 : 25;
            const spineTitle = rawMain.length > maxChars
              ? `${rawMain.slice(0, maxChars - 1).replace(/\s+\S*$/, "") || rawMain.slice(0, maxChars - 1)}…`
              : rawMain;
            const len = spineTitle.length;
            const fontScale = len > 20 ? 0.21 : len > 15 ? 0.24 : len > 11 ? 0.27 : 0.30;
            const binding = item.binding;
            const khmerSpine = isKhmerSpine(shown.row, item);
            return (
              <div
                key={`${shown.row}-${item.id}-${v}`}
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
                {/* spine (front of the box): Khmer books wear clean gold-tooled heritage bindings without cramped rotated text; other books keep their titled cloth spine */}
                <div
                  className={cn("shelf-face shelf-spine absolute flex flex-col items-center justify-between overflow-hidden rounded-[3px] py-3.5", item.tone.light ? "text-[#1B1A2E]" : "text-[#F6EFDF]")}
                  data-ink={item.tone.light ? "dark" : "gold"}
                  data-binding={binding}
                  data-khmer={khmerSpine || undefined}
                  style={{ width: bw, height: bh, left: -bw / 2, top, backgroundColor: item.tone.bg, transform: `translateZ(${bd / 2}px)`, "--shade": "calc(var(--o, 0) * 0.55)" } as CSSProperties}
                >
                  <span aria-hidden="true" className="shelf-headband shelf-headband-top" />
                  <span aria-hidden="true" className="shelf-headband shelf-headband-bottom" />
                  {khmerSpine ? (
                    <>
                      <span aria-hidden="true" className="shelf-khmer-cap">
                        <span className="shelf-rules" />
                      </span>
                      {binding === "bands" ? <span aria-hidden="true" className="shelf-band" /> : null}
                      <KhmerSpineArt binding={binding} />
                      {binding === "bands" ? <span aria-hidden="true" className="shelf-band" /> : null}
                      <span aria-hidden="true" className="shelf-khmer-foot">
                        <span className="shelf-rule-thin" />
                        <span className="shelf-khmer-jewel" />
                        <span className="shelf-rules" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="shelf-rules" />
                      {binding === "bands" ? <span aria-hidden="true" className="shelf-band" /> : null}
                      <span className={cn("shelf-label flex items-center justify-center overflow-hidden", binding === "label" && "shelf-label-panel")}>
                        <span
                          className="shelf-title max-h-full overflow-hidden text-ellipsis whitespace-nowrap text-center font-display leading-none tracking-[0.025em] [text-orientation:mixed] [writing-mode:vertical-rl]"
                          style={{ fontSize: Math.max(9.5, Math.min(14.5, bw * fontScale)) }}
                        >
                          {spineTitle}
                        </span>
                      </span>
                      {binding === "bands" ? <span aria-hidden="true" className="shelf-band" /> : null}
                      <span className="grid w-full justify-items-center gap-1.5">
                        <span aria-hidden="true" className="shelf-rule-thin" />
                        <span
                          className={cn("shelf-surname max-h-[5.5em] overflow-hidden whitespace-nowrap font-semibold uppercase tracking-[0.12em] [writing-mode:vertical-rl]", item.tone.light ? "text-[#1B1A2E]" : item.tone.gold ? "text-[#E8C766]" : "text-[#F6EFDF]")}
                          style={{ fontSize: Math.max(8, Math.min(10, bw * 0.18)) }}
                        >
                          {item.surname}
                        </span>
                        <span aria-hidden="true" className="shelf-ornament" />
                      </span>
                    </>
                  )}
                </div>
                {/* front cover (right side of the box) */}
                <div
                  className="shelf-face shelf-cover absolute overflow-hidden rounded-[3px] [backface-visibility:hidden]"
                  style={{ width: bd, height: bh, left: -bd / 2, top, background: item.tone.bg, transform: `rotateY(90deg) translateZ(${bw / 2}px)`, "--shade": "calc((1 - var(--o, 0)) * 0.5)", boxShadow: "0 34px 60px -26px rgb(20 16 10 / calc(var(--o, 0) * 0.55))" } as CSSProperties}
                >
                  {item.book?.cover_image_url ? (
                    <img src={item.book.cover_image_url} alt="" draggable={false} loading={v >= n && v < 2 * n ? "eager" : "lazy"} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center p-6 text-center font-display text-2xl leading-tight text-[#F6EFDF]">{item.book ? item.title : ""}</span>
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
                  style={{ width: bw * 0.9, height: bd * 0.97, left: -bw * 0.45, top: top - (bd * 0.97) / 2, transform: "rotateX(90deg)", opacity: "calc(1 - var(--o, 0) * 1.6)" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* The shelf's front rail (owner 2026-11-11): an oak plank hung under the board, in the board's own wood. Brass
          knobs at the ends turn the shelf; in the middle a brass label holder carries the book's paper label (cover,
          title, author and how many copies are left), then the price and the actions straight on the wood. */}
      <div className="relative z-10 mx-auto -mt-1 pb-5" style={{ width: "calc(100% - 2rem)", maxWidth: width }} aria-live="polite">
        <div className="shelf-rail grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-b-[1.4rem] rounded-t-[3px] px-3 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] lg:gap-x-4 lg:px-4">
          <button type="button" onClick={() => go(-1)} aria-label={h.prevBook} className="shelf-knob">
            <ArrowLeft className="size-[18px]" aria-hidden="true" />
          </button>
          <div className="shelf-holder min-w-0 rounded-[9px] p-[5px]">
            <div className="shelf-card flex min-h-20 min-w-0 flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden rounded-[5px] px-4 py-2.5 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <div className="overflow-hidden">
                <p key={`t-${shown0?.id}`} className={cn("shelf-roll line-clamp-2 font-display text-[clamp(1rem,1.4vw,1.25rem)] leading-snug text-[#1B1A2E]", dir < 0 && "shelf-roll-down")}>
                  {shown0?.book ? shown0.title : dict.splash.tagline}
                </p>
                </div>
                <div className="overflow-hidden">
                <p key={`a-${shown0?.id}`} className={cn("shelf-roll mt-0.5 truncate text-[13px] text-[#5C5547] [animation-delay:60ms]", dir < 0 && "shelf-roll-down")}>
                  {shown0?.book ? (shown0.by ? h.by(shown0.by) : h.unknownAuthor) : dict.shopExtras.rows[captionRow]}
                </p>
                </div>
              </div>
              {book ? (
                // Owner 2026-11-26: "View" lives on the label, next to the stock note, instead of over the cover art.
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
                  <StockNote key={`s-${shown0?.id}`} book={book} />
                  <Link to={href} className="shelf-view" aria-label={`${h.viewBook}: ${shown0?.title ?? ""}`}>
                    {h.viewShort}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={() => go(1)} aria-label={h.nextBook} className="shelf-knob lg:order-last">
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </button>
          <div className="col-span-3 flex items-center justify-between gap-4 px-2 lg:contents">
          <div className="flex flex-col items-start gap-1 lg:items-end">
            {price ? <span className="whitespace-nowrap font-display text-[1.6rem] leading-none tabular-nums text-[#FBF6EC]">{price}</span> : null}
            {book ? <ReaderScore book={book} showCount={false} className="text-[13px] text-[#F1DCBC] [&_.text-foreground]:text-[#FBF6EC]" /> : null}
          </div>
          <div className="flex items-center justify-center gap-2">
            {book && book.in_stock !== false ? (
              <button
                type="button"
                onClick={() => cart.add(book)}
                disabled={cart.pendingBookId === book.id}
                aria-label={h.addToCart}
                title={h.addToCart}
                className="inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FBF6EC] px-4 text-sm font-semibold text-[#1B1A2E] shadow-sm transition-[filter,transform] hover:brightness-105 active:scale-[0.97] disabled:opacity-70"
              >
                <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{h.addToCart}</span>
              </button>
            ) : null}
          </div>
          </div>
        </div>
        {/* For screen readers always; shown on screen only while the shelf has keyboard focus. */}
        <p id="shelf-hint" className="shelf-hint mt-2 text-center text-xs text-muted-foreground">{h.shelfHint}</p>
      </div>
    </>
  );
}

/**
 * Stock on the paper label: "Only N left" with a five-notch meter when stock is low (the shop shows the count from
 * shop.low_stock_badge copies down), otherwise a quiet "In stock" or "Out of stock".
 */
function StockNote({ book }: { book: BookCard }) {
  const { dict } = useT();
  const left = book.low_stock_remaining ?? 0;
  if (book.in_stock === false) return <span className="shelf-roll shrink-0 text-[13px] font-semibold text-[#5C5547]">{dict.cards.outOfStock}</span>;
  if (left <= 0) {
    return (
      <span className="shelf-roll inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#2F5D4A]">
        <span className="size-2 rounded-full bg-[#3F7D5E]" aria-hidden="true" /> {dict.cards.inStock}
      </span>
    );
  }
  return (
    <span className="shelf-roll grid shrink-0 justify-items-start gap-1 [animation-delay:120ms] md:justify-items-end">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#A63A1F]">
        <span className="size-1.5 animate-pulse rounded-full bg-[#C2410C] motion-reduce:animate-none" aria-hidden="true" />
        {dict.cards.onlyLeft(left)}
      </span>
      <span className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-3.5 rounded-full", i < Math.min(left, 5) ? "bg-[#C2410C]" : "bg-[#DCCDB1]")} />
        ))}
      </span>
    </span>
  );
}
