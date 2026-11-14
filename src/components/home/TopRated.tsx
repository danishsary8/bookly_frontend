import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, ShoppingBag } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import CircularCarousel from "@/components/CircularCarousel";
import { CoverColorWash } from "@/components/home/CoverColorWash";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames, hasScore } from "@/components/catalog/bookMeta";
import { useAddToCart } from "@/components/catalog/useCatalogActions";
import { ReaderScore } from "@/components/ReaderScore";
import { StarRating } from "@/components/StarRating";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";
import demoReviews from "@/data/topRatedDemo.json";

/*
 * Home "Top rated" (pages/home.md): the top 10 by rating. Left, a showcase panel: the ten covers on a slowly turning
 * cylinder (CircularCarousel) over a soft wash of the front book's colours, with its rank, score, price and Add to
 * cart underneath. Right, the ranked list (the accessible version of the same ten): rank, cover, title, author,
 * and a quiet selection arrow. Clicking a row (owner 2026-11-11) turns the carousel to that book; the
 * row of the book in front is highlighted. Scores show without the number of reviews (owner 2026-11-11). The whole
 * section (heading, showcase and the ten rows) is sized to fit one laptop screen under the header.
 */

const scoreOf = (b: BookCard) => (toNumber(b.review_count) > 0 && toNumber(b.rating_avg) > 0 ? toNumber(b.rating_avg) : toNumber(b.reader_rating));
const demoEnabled = import.meta.env.DEV && import.meta.env.VITE_DEMO_REVIEWS === "true";

export function TopRated() {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const cart = useAddToCart();
  const navigate = useNavigate();
  const query = useQuery(catalogQueries.books({ sort: "rating", per_page: 20 }));
  // Local fixtures preview a complete Top 10 without changing the connected production catalog.
  const all = (query.data?.data ?? []).map((book) => {
    const demo = demoEnabled ? demoReviews.find((entry) => entry.title === book.title) : undefined;
    return demo ? { ...book, review_count: demo.ratings.length, rating_avg: demo.ratings.reduce((sum, score) => sum + score, 0) / demo.ratings.length } : book;
  });
  // Only eligible scores belong in Top rated; never inflate low or missing real ratings.
  const scored = all.filter((book) => hasScore(book) && scoreOf(book) >= 3.5).sort((a, b) => scoreOf(b) - scoreOf(a));
  const books = scored.slice(0, 10);
  const [front, setFront] = useState(0);
  // A click on a row: { index, n } (n changes on every click, so the same row can be picked again).
  const [pick, setPick] = useState<{ index: number; n: number } | undefined>(undefined);

  if (query.isError || (!query.isPending && scored.length === 0)) return null;
  const price = (b: BookCard) => formatMoney(b.price_from_usd, b.price_from_khr, currency);
  const lead = books[front] ?? books[0];

  return (
    <section aria-labelledby="top-rated-title" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.topRatedEyebrow}
          </p>
          <h2 id="top-rated-title" className="mt-2 font-display text-[1.953rem] leading-tight">{scored.length >= 10 || query.isPending ? h.topTen : h.topRatedTitle}</h2>
          {demoEnabled ? <p className="mt-2 text-xs text-muted-foreground">Demo ratings · sample reviews for local preview</p> : null}
        </div>
        <Link to="/books?sort=rating" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
          {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.topRatedTitle} className="grid gap-5 lg:h-[clamp(30rem,calc(100svh-var(--header-h)-10rem),32rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <Skeleton className="h-[31rem] rounded-3xl" />
          <div className="grid gap-2">
            {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        </SkeletonGroup>
      ) : (
        <div className="grid gap-5 lg:h-[clamp(30rem,calc(100svh-var(--header-h)-10rem),32rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          {/* Showcase */}
          <div className="relative isolate flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card">
            <CoverColorWash src={lead?.cover_image_url} sources={books.flatMap((book) => book.cover_image_url ? [book.cover_image_url] : [])} />
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_45%,var(--card)_95%)]" aria-hidden="true" />
            <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#1B1A2E] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-gold shadow-sm">
              <Crown className="size-3.5" aria-hidden="true" /> {h.rank(front + 1)}
            </span>
            <div className="relative mt-4 h-[18rem] flex-none lg:min-h-0 lg:flex-1">
              <span className="pointer-events-none absolute bottom-6 left-1/2 h-12 w-3/5 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(20_16_10/0.22),transparent)]" aria-hidden="true" />
              <CircularCarousel
                items={books.map((b, i) => ({ src: b.cover_image_url, alt: b.title, title: b.title, subtitle: h.rank(i + 1) }))}
                cardWidth={144}
                aspectRatio={2 / 3}
                speed={12} // 10 books: one step every 3 s
                intro="rise"
                active={pick?.index}
                activeKey={pick?.n}
                onActiveChange={setFront}
                onSelect={(i) => books[i]?.id && navigate(`/books/${books[i].id}`)}
              />
            </div>
            {lead ? (
              <div key={`cap-${lead.id}`} className="hero-caption mt-auto shrink-0 flex flex-wrap items-end justify-between gap-4 px-6 pb-5">
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.55rem] leading-tight">
                    <Link to={`/books/${lead.id}`} className="underline-offset-4 hover:underline">{lead.title}</Link>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{h.by(authorNames(lead.authors) || h.unknownAuthor)}</p>
                  {hasScore(lead) ? (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="font-display text-[2rem] leading-none tabular-nums">{scoreOf(lead).toFixed(1)}</span>
                      {/* customer reviews: stars beside the big score; a Reader rating keeps its source label */}
                      {toNumber(lead.review_count) > 0 ? <StarRating value={scoreOf(lead)} summary={false} /> : <ReaderScore book={lead} className="text-[13px]" />}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">{h.notRated}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-semibold tabular-nums">{price(lead)}</span>
                  {lead.in_stock === false ? null : (
                    <button
                      type="button"
                      onClick={(e) => cart.add(lead, undefined, undefined, { from: e.currentTarget.closest("section")?.querySelector(".circular-card[data-front] img") ?? null })}
                      disabled={cart.pendingBookId === lead.id}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_22px_-12px_rgb(20_32_122/0.7)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-70"
                    >
                      <ShoppingBag className="size-4" aria-hidden="true" /> {h.addToCart}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* The ranked list (owner 2026-11-12): one calm sheet beside the showcase. Hairlines between rows; each row is
              rank, cover, title and author without repeating the showcase price or rating. The front book's row is
              tinted with a lapis rule. */}
          <ol className="grid min-h-0 min-w-0 divide-y divide-border/50 rounded-3xl border border-border bg-card px-2 py-1.5" style={{ gridTemplateRows: `repeat(${books.length}, minmax(0, 1fr))` }}>
            {books.map((book, i) => {              return (
                <li key={book.id} className="flex min-h-0 min-w-0">
                  {/* Click a row to bring its book to the front; click the front book's row again to open it. */}
                  <button
                    type="button"
                    onClick={() => (i === front ? navigate(`/books/${book.id}`) : setPick((p) => ({ index: i, n: (p?.n ?? 0) + 1 })))}
                    aria-current={i === front || undefined}
                    className={cn(
                      "group relative flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-1 text-left outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                      i === front ? "bg-lapis-tint" : "hover:bg-muted/60",
                    )}
                  >
                    <span className={cn("absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-primary transition-opacity duration-300", i === front ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    <span className={cn("w-7 shrink-0 text-center font-display text-[1.45rem] leading-none tabular-nums", i < 3 ? "text-[#946C1F]" : "text-muted-foreground/70")}>{i + 1}</span>
                    <span className="w-6 shrink-0"><BookCover src={book.cover_image_url} title={book.title} className="rounded-[3px] shadow-[0_6px_12px_-8px_rgb(20_16_10/0.6)]" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] leading-tight">{book.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                    </span>
                    <ArrowRight className={cn("size-4 shrink-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none", i === front ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100")} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
