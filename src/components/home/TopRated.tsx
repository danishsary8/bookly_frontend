import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, ShoppingBag } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import CircularCarousel from "@/components/CircularCarousel";
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

/*
 * Home "Top rated" (pages/home.md): the top 10 by rating. Left, a showcase panel: the ten covers on a slowly turning
 * cylinder (CircularCarousel) over a soft wash of the front book's colours, with its rank, score, price and Add to
 * cart underneath. Right, the ranked list (the accessible version of the same ten): rank, cover, title, author,
 * stars, price and "Only N left" when stock is low. Clicking a row (owner 2026-11-11) turns the carousel to that book; the
 * row of the book in front is highlighted. Scores show without the number of reviews (owner 2026-11-11). The whole
 * section (heading, showcase and the ten rows) is sized to fit one laptop screen under the header.
 */

const scoreOf = (b: BookCard) => (toNumber(b.review_count) > 0 && toNumber(b.rating_avg) > 0 ? toNumber(b.rating_avg) : toNumber(b.reader_rating));

export function TopRated() {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const cart = useAddToCart();
  const navigate = useNavigate();
  const query = useQuery(catalogQueries.books({ sort: "rating", per_page: 20 }));
  // Ten rows: the rated books first (the API's rating order), then — only when fewer than ten have a rating — the next
  // books from the same list, marked "Not rated yet". The heading says "Top 10 rated" only when all ten are rated.
  const all = query.data?.data ?? [];
  const scored = all.filter(hasScore);
  const books = [...scored, ...all.filter((b) => !hasScore(b))].slice(0, 10);
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
          <h2 id="top-rated-title" className="mt-2 font-display text-[1.953rem] leading-tight">{scored.length >= 10 || query.isPending ? h.topTen : h.topTenBooks}</h2>
        </div>
        <Link to="/books?sort=rating" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
          {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.topRatedTitle} className="grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <Skeleton className="h-[31rem] rounded-3xl" />
          <div className="grid gap-2">
            {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        </SkeletonGroup>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          {/* Showcase */}
          <div className="relative isolate flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
            {lead?.cover_image_url ? (
              <img key={`wash-${lead.id}`} src={lead.cover_image_url} alt="" aria-hidden="true" className="hero-wash pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-25 blur-3xl saturate-150" />
            ) : null}
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_30%,var(--card)_88%)]" aria-hidden="true" />
            <span className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#1B1A2E] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-gold shadow-sm">
              <Crown className="size-3.5" aria-hidden="true" /> {h.rank(front + 1)}
            </span>
            <div className="relative mt-5 h-[21.5rem] flex-none">
              <span className="pointer-events-none absolute bottom-6 left-1/2 h-12 w-3/5 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(20_16_10/0.22),transparent)]" aria-hidden="true" />
              <CircularCarousel
                items={books.map((b, i) => ({ src: b.cover_image_url, alt: b.title, title: b.title, subtitle: h.rank(i + 1) }))}
                cardWidth={158}
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
              <div key={`cap-${lead.id}`} className="hero-caption mt-auto flex flex-wrap items-end justify-between gap-4 px-6 pb-5">
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

          {/* The ranked list */}
          <ol className="grid content-start gap-1">
            {books.map((book, i) => (
              <li key={book.id}>
                {/* Click a row to bring its book to the front; click the front book's row again to open it. */}
                <button
                  type="button"
                  onClick={() => (i === front ? navigate(`/books/${book.id}`) : setPick((p) => ({ index: i, n: (p?.n ?? 0) + 1 })))}
                  aria-current={i === front || undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-3.5 rounded-xl border px-3 py-1 text-left outline-none transition-[background-color,border-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                    i === front ? "border-input bg-card shadow-[0_14px_28px_-22px_rgb(20_32_122/0.55)]" : "border-transparent hover:bg-card/70",
                  )}
                >
                  <span className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary transition-opacity duration-300", i === front ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  <span className={cn("w-8 shrink-0 text-center font-display text-[1.6rem] leading-none tabular-nums", i < 3 ? "text-[#946C1F]" : "rank-numeral-sm")}>{i + 1}</span>
                  <span className="w-7 shrink-0"><BookCover src={book.cover_image_url} title={book.title} className="rounded-[3px] shadow-[0_6px_12px_-8px_rgb(20_16_10/0.6)]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[15.5px] leading-snug">{book.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                  </span>
                  {book.low_stock_remaining ? (
                    <span className="hidden shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-text xl:inline">{dict.cards.onlyLeft(book.low_stock_remaining)}</span>
                  ) : null}
                  {hasScore(book) ? <ReaderScore book={book} showCount={false} className="hidden shrink-0 text-xs sm:inline-flex" /> : <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{h.notRated}</span>}
                  <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">{price(book)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
