import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown, ShoppingBag } from "lucide-react";
import { m } from "motion/react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames, hasScore } from "@/components/catalog/bookMeta";
import { useAddToCart } from "@/components/catalog/useCatalogActions";
import { ReaderScore } from "@/components/ReaderScore";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toNumber } from "@/lib/format";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home "Top rated" (pages/home.md): a ranked chart, not another row of cards.
 * No. 1 is a feature panel: a large cover standing on a glossy floor (mirror image), a gold crown, the score
 * in big type beside the stars, price and Add to cart. Nos. 2–5 are a 2×2 grid of rank cards: a large outlined
 * numeral behind the cover, title, author, and a footer line with the stars and the price.
 * Only books with a rating (customer reviews, or the shop's Reader rating) appear; with none, the section hides.
 */

/** The big score on No. 1: customer reviews first, else the shop's Reader rating. */
const scoreOf = (b: BookCard) => (toNumber(b.review_count) > 0 && toNumber(b.rating_avg) > 0 ? toNumber(b.rating_avg) : toNumber(b.reader_rating));

const ease = [0.2, 0.8, 0.2, 1] as const;

export function TopRated() {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const cart = useAddToCart();
  const query = useQuery(catalogQueries.books({ sort: "rating", per_page: 10 }));
  const books = (query.data?.data ?? []).filter(hasScore).slice(0, 5);

  if (query.isError || (!query.isPending && books.length === 0)) return null;
  const price = (b: BookCard) => formatMoney(b.price_from_usd, b.price_from_khr, currency);
  const [first, ...rest] = books;

  return (
    <section aria-labelledby="top-rated-title" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.topRatedEyebrow}
          </p>
          <h2 id="top-rated-title" className="mt-2 font-display text-[1.953rem] leading-tight">{h.topRatedTitle}</h2>
        </div>
        <Link to="/books?sort=rating" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
          {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.topRatedTitle} className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="h-80 rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        </SkeletonGroup>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* No. 1 */}
          <m.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease }}
            className="group relative isolate grid content-center overflow-hidden rounded-3xl border border-border bg-card sm:grid-cols-[auto_1fr]"
          >
            {first.cover_image_url ? <img src={first.cover_image_url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-20 blur-3xl saturate-150" /> : null}
            <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,var(--card)_78%)]" aria-hidden="true" />

            {/* cover on a glossy floor */}
            <div className="relative grid place-items-center px-8 pb-0 pt-14 sm:pr-0">
              <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#1B1A2E] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-gold shadow-sm">
                <Crown className="size-3.5" aria-hidden="true" /> {h.rank(1)}
              </span>
              <Link to={`/books/${first.id}`} tabIndex={-1} aria-hidden="true" className="top-cover relative block w-36 sm:w-40">
                <span data-fly-cover="" className="relative block overflow-hidden rounded-md shadow-[0_30px_50px_-24px_rgb(20_16_10/0.65)]">
                  <BookCover src={first.cover_image_url} title={first.title} eager />
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.22)_0_2%,rgb(255_255_255/0.16)_3%,transparent_8%),linear-gradient(120deg,rgb(255_255_255/0.14),transparent_45%)]" />
                </span>
                {first.cover_image_url ? (
                  <span className="mirror-floor pointer-events-none absolute inset-x-0 top-full mt-[3px] block aspect-[2/3] overflow-hidden rounded-md" aria-hidden="true">
                    <img src={first.cover_image_url} alt="" aria-hidden="true" className="size-full -scale-y-100 object-cover" />
                  </span>
                ) : null}
              </Link>
              <span className="block h-10" aria-hidden="true" />
            </div>

            <div className="flex min-w-0 flex-col justify-center p-6 pt-2 sm:pl-2 sm:pt-6">
              <h3 className="font-display text-2xl leading-tight">
                <Link to={`/books/${first.id}`} className="line-clamp-2 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{first.title}</Link>
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{h.by(authorNames(first.authors) || h.unknownAuthor)}</p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-5xl leading-none tabular-nums">{scoreOf(first).toFixed(1)}</span>
                <ReaderScore book={first} className="pb-1.5 text-[13px]" />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="text-xl font-semibold tabular-nums">{price(first)}</span>
                {first.in_stock === false ? null : (
                  <button
                    type="button"
                    onClick={() => cart.add(first)}
                    disabled={cart.pendingBookId === first.id}
                    className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-70"
                  >
                    <ShoppingBag className="size-4" aria-hidden="true" /> {h.addToCart}
                  </button>
                )}
              </div>
            </div>
          </m.article>

          {/* Nos. 2–5 */}
          <ol start={2} className="grid gap-4 sm:grid-cols-2">
            {rest.map((book, i) => (
              <m.li
                key={book.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease, delay: 0.08 * (i + 1) }}
              >
                <Link
                  to={`/books/${book.id}`}
                  className="group relative isolate flex h-full gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 outline-none transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-[0_22px_36px_-26px_rgb(20_32_122/0.5)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
                >
                  {/* the rank, large and outlined, behind everything */}
                  <span className="rank-numeral pointer-events-none absolute -right-1 -top-2 -z-10 font-display text-[5.5rem] leading-none transition-colors duration-300" aria-hidden="true">
                    {i + 2}
                  </span>
                  <span className="w-[4.5rem] shrink-0 self-start transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-[1.03] motion-reduce:group-hover:transform-none">
                    <BookCover src={book.cover_image_url} title={book.title} className="rounded-[4px] shadow-[0_14px_22px_-12px_rgb(20_16_10/0.6)]" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{h.rank(i + 2)}</span>
                    <span className="mt-1 line-clamp-2 font-display text-[17px] leading-snug">{book.title}</span>
                    <span className="mt-0.5 truncate text-[13px] text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                      <ReaderScore book={book} className="text-[13px]" />
                      <span className="text-[15px] font-semibold tabular-nums">{price(book)}</span>
                    </span>
                  </span>
                </Link>
              </m.li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
