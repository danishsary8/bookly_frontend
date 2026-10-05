import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookX, Heart, RotateCcw, ShoppingBag, Truck, Wallet } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import type { BookCard, BookDetail } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { BookShelf } from "@/components/catalog/BookShelf";
import { FormatPicker } from "@/components/catalog/FormatPicker";
import { ReviewsSection } from "@/components/catalog/ReviewsSection";
import { YourReview } from "@/features/reviews/YourReview";
import { coverLayoutId, type BookPreviewState } from "@/components/catalog/coverMorph";
import { pickVariant, useAddToCart, useWishlist } from "@/components/catalog/useCatalogActions";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CtaGlare } from "@/components/CtaGlare";
import { EmptyState } from "@/components/EmptyState";
import { MorphCover } from "@/components/MorphCover";
import { QuantityStepper } from "@/components/QuantityStepper";
import { StarRating } from "@/components/StarRating";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { addRecentlyViewed, useRecentlyViewed } from "@/stores/recentlyViewed";

/*
 * /books/:id. Layout (MASTER 5/7 split): cover panel | title, authors, rating,
 * format picker, price, quantity, Add to cart (the page's one vermilion CTA),
 * wishlist and service notes. Then Description / Details / Reviews tabs and
 * shelves: more by the author, the series, recently viewed. A card click shows
 * its data at once (router state) while the full book loads; below 1024px a
 * purchase bar sticks to the bottom once the main button scrolls away.
 */

const MAX_QTY = 10;
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const DIGITAL = new Set(["ebook", "audiobook"]);

function DetailSkeleton() {
  return (
    <SkeletonGroup label="Loading book…" className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="rounded-xl bg-surface-2 p-8 lg:col-span-5">
        <Skeleton className="mx-auto aspect-[2/3] w-full max-w-[300px]" />
      </div>
      <div className="grid content-start gap-4 lg:col-span-7">
        <Skeleton className="h-3 w-1/5" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="mt-4 h-40 w-full rounded-xl" />
      </div>
    </SkeletonGroup>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-4 border-t border-border py-3 first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function Purchase({ book }: { book: BookDetail }) {
  const currency = useCurrency();
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const variants = book.variants ?? [];
  const [variantId, setVariantId] = useState<number | undefined>(() => pickVariant(variants)?.id ?? variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const variant = variants.find((v) => v.id === variantId);
  const digital = DIGITAL.has(variant?.format ?? "");
  const buyable = Boolean(variant && variant.in_stock !== false);
  const saved = wishlist.isSaved(book.id);
  const adding = cart.pendingBookId === book.id;

  const mainButton = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  // A scroll check rather than an IntersectionObserver: a jump from below the fold to above it
  // (End key, a fast fling) never crosses the observer's threshold and would leave the bar hidden.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = mainButton.current;
      const footer = document.querySelector("footer");
      const footerInView = footer ? footer.getBoundingClientRect().top < window.innerHeight : false;
      if (el) setShowBar(el.getBoundingClientRect().bottom < 0 && !footerInView);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const add = () => variant?.id && cart.add(book, variant.id, digital ? 1 : quantity);

  return (
    <div className="grid gap-6">
      {variants.length > 0 ? <FormatPicker variants={variants} value={variantId} onChange={setVariantId} name={`format-${book.id}`} /> : null}

      <div className="grid gap-1">
        <p className="font-display text-[2.441rem] leading-none tabular-nums text-foreground">
          {variant ? formatMoney(variant.price_usd, variant.price_khr, currency) : formatMoney(book.price_from_usd, book.price_from_khr, currency)}
        </p>
        <p className={cn("text-sm", buyable ? "text-success" : "text-destructive")}>
          {!variant ? "Not available" : !buyable ? "Out of stock in this format" : digital ? "Available now as a download" : "In stock, ready to ship"}
        </p>
      </div>

      <div ref={mainButton} className="flex flex-wrap items-center gap-3">
        {!digital && buyable ? <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QTY} label={`Quantity for ${book.title}`} /> : null}
        <CtaGlare className="min-w-[12rem] flex-1 sm:flex-none">
          <Button variant="cta" size="lg" className="w-full" onClick={add} disabled={!buyable} loading={adding}>
            {!adding ? <ShoppingBag aria-hidden="true" /> : null}
            {adding ? "Adding…" : "Add to cart"}
          </Button>
        </CtaGlare>
        <Button variant="outline" size="icon-lg" onClick={() => wishlist.toggle(book)} aria-pressed={saved} aria-label={`Save ${book.title} to your wishlist`} className={cn(saved && "text-accent-text")}>
          <Heart className={cn(saved && "fill-current")} aria-hidden="true" />
        </Button>
      </div>

      <ul className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
        <li className="flex items-start gap-2.5">
          <Wallet className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Cash on delivery</span>
            <span className="text-muted-foreground">Pay when it arrives</span>
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Truck className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Delivery in Cambodia</span>
            <span className="text-muted-foreground">Fee shown at checkout</span>
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <RotateCcw className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block font-semibold">Easy returns</span>
            <span className="text-muted-foreground">On printed books</span>
          </span>
        </li>
      </ul>

      {/* Sticky purchase bar on small screens once the main button is out of view. */}
      <div
        aria-hidden={!showBar}
        className={cn(
          "fixed inset-x-0 bottom-0 z-(--z-header) border-t border-border bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm transition-transform duration-(--dur-toggle) lg:hidden",
          showBar ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{book.title}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {variant ? `${formatLabel(variant.format)} · ${formatMoney(variant.price_usd, variant.price_khr, currency)}` : null}
            </p>
          </div>
          <Button variant="cta" onClick={add} disabled={!buyable} loading={adding} tabIndex={showBar ? 0 : -1}>
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  const { id } = useParams();
  const bookId = Number(id);
  const valid = Number.isInteger(bookId) && bookId > 0;
  const location = useLocation();
  const preview = (location.state as BookPreviewState | null)?.preview;
  const { hash } = location;
  const query = useQuery({ ...catalogQueries.book(bookId), enabled: valid });
  const book = query.data;
  const shown: BookCard | undefined = book ?? (preview?.id === bookId ? preview : undefined);
  const showSkeleton = useSkeletonVisible(query.isPending && !shown);
  const recent = useRecentlyViewed();
  useDocumentTitle(shown?.title ?? (query.isError ? "Book not found" : null), {
    description: book ? book.description || `${book.title}${book.authors?.length ? ` by ${book.authors.map((a) => a.name).join(", ")}` : ""}. Order from Bookly, delivered across Cambodia.` : null,
    image: shown?.cover_image_url,
    noindex: query.isError,
  });

  const firstAuthor = book?.authors?.[0];
  const byAuthor = useQuery({ ...catalogQueries.books({ author_id: firstAuthor?.id, per_page: 9 }), enabled: Boolean(firstAuthor?.id) });
  const series = useQuery({ ...catalogQueries.series(book?.series?.id ?? 0), enabled: Boolean(book?.series?.id) });

  useEffect(() => {
    if (book) addRecentlyViewed(book);
  }, [book]);

  const notFound = !valid || (query.isError && ApiError.from(query.error).kind === "not_found");
  if (notFound) {
    return (
      <div className="container-shell py-16">
        <EmptyState
          icon={BookX}
          headingLevel="h1"
          title="We couldn't find that book"
          description="It may have been removed from the catalogue, or the link is mistyped."
          action={
            <Link to="/books" className={buttonVariants()}>
              Browse all books
            </Link>
          }
        />
      </div>
    );
  }
  if (query.isError && !shown) {
    return (
      <div className="container-shell py-16">
        <ErrorState error={query.error} onRetry={() => query.refetch()} headingLevel="h1" />
      </div>
    );
  }

  const category = book?.categories?.[0];
  const authors = shown?.authors ?? [];
  const otherByAuthor = (byAuthor.data?.data ?? []).filter((b) => b.id !== bookId).slice(0, 8);
  const otherInSeries = (series.data?.books ?? []).filter((b) => b.id !== bookId);
  const recentOthers = recent.filter((b) => b.id !== bookId);

  return (
    <div className="container-shell pb-24 pt-6 sm:pt-8">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Books", to: "/books" },
          ...(category ? [{ label: category.name ?? "", to: `/categories/${category.slug}` }] : []),
          { label: shown?.title ?? "Book" },
        ]}
      />

      {!shown ? (
        showSkeleton ? (
          <div className="mt-6">
            <DetailSkeleton />
          </div>
        ) : null
      ) : (
        <article className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16" aria-labelledby="book-title">
          <div className="lg:col-span-5">
            <div className="rounded-xl bg-surface-2 px-8 py-10 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
              <MorphCover layoutId={coverLayoutId(bookId)} className="mx-auto w-full max-w-[300px] shadow-lift">
                <BookCover src={shown.cover_image_url} title={shown.title} alt={`${shown.title} cover`} eager />
              </MorphCover>
            </div>
          </div>

          <div className="grid content-start gap-6 lg:col-span-7">
            <header className="grid gap-3">
              {book?.categories?.length ? (
                <p className="flex flex-wrap gap-x-3 text-xs font-bold uppercase tracking-[0.16em] text-accent-text">
                  {book.categories.map((c) => (
                    <Link key={c.id} to={`/categories/${c.slug}`} className="underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  ))}
                </p>
              ) : null}
              <h1 id="book-title" className="font-display text-[2.441rem] leading-[1.1] sm:text-[3.052rem]">
                {shown.title}
              </h1>
              {authors.length ? (
                <p className="text-lg text-muted-foreground">
                  by{" "}
                  {authors.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 ? ", " : null}
                      <Link to={`/authors/${a.id}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
                        {a.name}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <StarRating value={shown.rating_avg} count={shown.review_count} />
                {book?.series ? (
                  <Link to={`/series/${book.series.id}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                    {book.series.order ? `Book ${book.series.order} in ` : "Part of "}
                    {book.series.name}
                  </Link>
                ) : null}
              </div>
            </header>

            {book ? <Purchase key={book.id} book={book} /> : <Skeleton className="h-56 w-full rounded-xl" aria-hidden="true" />}
          </div>
        </article>
      )}

      {book ? (
        <Tabs defaultValue={hash === "#your-review" || hash === "#reviews" ? "reviews" : "description"} className="mt-16">
          <TabsList aria-label="About this book">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({book.review_count ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <div className="max-w-prose whitespace-pre-line text-[17px] leading-8 text-foreground">{book.description || "No description yet."}</div>
          </TabsContent>
          <TabsContent value="details">
            <dl className="max-w-2xl text-[15px]">
              <Detail label="Authors">{authors.map((a) => a.name).join(", ")}</Detail>
              <Detail label="Publisher">
                {book.publisher ? (
                  <Link to={`/publishers/${book.publisher.id}`} className="underline-offset-4 hover:underline">
                    {book.publisher.name}
                  </Link>
                ) : null}
              </Detail>
              <Detail label="Published">{book.publish_date ? dateFormat.format(new Date(book.publish_date)) : null}</Detail>
              <Detail label="Language">{book.language}</Detail>
              <Detail label="Pages">{book.page_count ? book.page_count.toLocaleString("en-US") : null}</Detail>
              <Detail label="Formats">{(book.variants ?? []).map((v) => formatLabel(v.format)).join(", ")}</Detail>
              <Detail label="ISBN">
                {(book.variants ?? []).filter((v) => v.isbn).length ? (
                  <ul>
                    {(book.variants ?? []).filter((v) => v.isbn).map((v) => (
                      <li key={v.id} className="tabular-nums">
                        {v.isbn} <span className="text-muted-foreground">({formatLabel(v.format)})</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Detail>
            </dl>
          </TabsContent>
          <TabsContent value="reviews">
            <div className="grid gap-10">
              <YourReview bookId={book.id!} />
              <ReviewsSection bookId={book.id!} />
            </div>
          </TabsContent>
        </Tabs>
      ) : null}

      <div className="mt-20 grid gap-16">
        {book?.series && otherInSeries.length ? (
          <BookShelf id="series" eyebrow="The series" title={book.series.name ?? "In this series"} books={otherInSeries} seeAllHref={`/series/${book.series.id}`} seeAllLabel="Whole series" />
        ) : null}
        {firstAuthor ? (
          <BookShelf
            id="by-author"
            eyebrow="Same author"
            title={`More by ${firstAuthor.name}`}
            books={otherByAuthor}
            loading={byAuthor.isPending}
            seeAllHref={`/authors/${firstAuthor.id}`}
            seeAllLabel="About the author"
          />
        ) : null}
        <BookShelf id="recent" eyebrow="Your history" title="Recently viewed" books={recentOthers} />
      </div>
    </div>
  );
}
