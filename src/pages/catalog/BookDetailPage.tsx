import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BookX, Heart, RotateCcw, ShoppingBag, Truck, Wallet } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { stockAlertQueries, stockAlertsApi } from "@/api/endpoints/stockAlerts";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { BookCard, BookDetail, Customer } from "@/api/types";
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
import { JsonLd } from "@/components/seo/JsonLd";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { withNext } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { addRecentlyViewed, clearRecentlyViewed, useRecentlyViewed } from "@/stores/recentlyViewed";
import { toast } from "@/stores/toast";
import { formatName, useT } from "@/i18n";

/*
 * /books/:id. Layout (MASTER 5/7 split): cover panel | title, authors, rating,
 * format picker, price, quantity, Add to cart (the page's one vermilion CTA),
 * wishlist and service notes. Then Description / Details / Reviews tabs and
 * shelves: more by the author, the series, recently viewed. A card click shows
 * its data at once (router state) while the full book loads; below 1024px a
 * purchase bar sticks to the bottom once the main button scrolls away.
 */

const MAX_QTY = 10;
const DIGITAL = new Set(["ebook", "audiobook"]);

function DetailSkeleton() {
  const { dict } = useT();
  return (
    <SkeletonGroup label={dict.book.loading} className="grid gap-10 lg:grid-cols-12 lg:gap-16">
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
  const { dict } = useT();
  const b = dict.book;
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const session = useSession<Customer>("customer");
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const variants = book.variants ?? [];
  const [variantId, setVariantId] = useState<number | undefined>(() => pickVariant(variants)?.id ?? variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const variant = variants.find((v) => v.id === variantId);
  const digital = DIGITAL.has(variant?.format ?? "");
  const buyable = Boolean(variant && variant.in_stock !== false);
  const saved = wishlist.isSaved(book.id);
  const adding = cart.pendingBookId === book.id;

  const alerts = useQuery({
    ...stockAlertQueries.list(),
    enabled: Boolean(session?.token),
  });

  const activeAlert = alerts.data?.find((a) => a.book_variant_id === variant?.id && !a.notified_at);

  const createAlert = useMutation({
    mutationFn: (id: number) => stockAlertsApi.create(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockAlertQueries.all() });
      toast.success(b.alertSet);
    },
    onError: (err) => {
      toast.error(ApiError.from(err).message);
    },
  });

  const deleteAlert = useMutation({
    mutationFn: (id: number) => stockAlertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockAlertQueries.all() });
      toast.success(b.alertRemoved);
    },
    onError: (err) => {
      toast.error(ApiError.from(err).message);
    },
  });

  const onAlertClick = () => {
    if (!session?.token) {
      navigate(withNext("/login", location.pathname));
      return;
    }
    if (variant?.id) {
      createAlert.mutate(variant.id);
    }
  };

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
          {!variant ? b.notAvailable : !buyable ? dict.bookDetail.outOfStock : digital ? b.download : dict.bookDetail.inStock}
        </p>
      </div>

      <div ref={mainButton} className="flex flex-wrap items-center gap-3">
        {!digital && buyable ? <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QTY} label={b.quantityFor(book.title ?? "")} /> : null}
        {!digital && !buyable ? (
          activeAlert ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-1 px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Bell className="size-4 text-primary" aria-hidden="true" />
                {b.weWillEmailYou}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAlert.mutate(activeAlert.id!)}
                disabled={deleteAlert.isPending}
                loading={deleteAlert.isPending}
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {b.undoAlert}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={onAlertClick}
              disabled={createAlert.isPending}
              loading={createAlert.isPending}
              className="min-w-[12rem] flex-1 sm:flex-none gap-2"
            >
              <Bell className="size-4 text-primary" aria-hidden="true" />
              {b.tellMeWhenBack}
            </Button>
          )
        ) : (
          <CtaGlare className="min-w-[12rem] flex-1 sm:flex-none">
            <Button variant="cta" size="lg" className="w-full" onClick={add} disabled={!buyable} loading={adding}>
              {!adding ? <ShoppingBag aria-hidden="true" /> : null}
              {adding ? b.adding : dict.bookDetail.addToCart}
            </Button>
          </CtaGlare>
        )}
        <Button variant="outline" size="icon-lg" onClick={() => wishlist.toggle(book)} aria-pressed={saved} aria-label={b.saveToWishlist(book.title ?? "")} className={cn(saved && "text-accent-text")}>
          <Heart className={cn(saved && "fill-current")} aria-hidden="true" />
        </Button>
      </div>

      <ul className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
        <li className="flex items-start gap-2.5">
          <Wallet className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block font-semibold">{b.cod}</span>
            <span className="text-muted-foreground">{b.codLead}</span>
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Truck className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block font-semibold">{b.delivery}</span>
            <span className="text-muted-foreground">{b.deliveryLead}</span>
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <RotateCcw className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="block font-semibold">{b.returns}</span>
            <span className="text-muted-foreground">{b.returnsLead}</span>
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
              {variant ? `${formatName(dict, variant.format)} · ${formatMoney(variant.price_usd, variant.price_khr, currency)}` : null}
            </p>
          </div>
          {!digital && !buyable ? (
            activeAlert ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Bell className="size-3.5 text-primary" aria-hidden="true" />
                  {b.weWillEmailYou}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlert.mutate(activeAlert.id!)}
                  disabled={deleteAlert.isPending}
                  tabIndex={showBar ? 0 : -1}
                  className="h-7 text-xs"
                >
                  {b.undoAlert}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onAlertClick}
                disabled={createAlert.isPending}
                tabIndex={showBar ? 0 : -1}
                className="gap-1.5"
              >
                <Bell className="size-3.5 text-primary" aria-hidden="true" />
                {b.tellMeWhenBack}
              </Button>
            )
          ) : (
            <Button variant="cta" onClick={add} disabled={!buyable} loading={adding} tabIndex={showBar ? 0 : -1}>
              {dict.bookDetail.addToCart}
            </Button>
          )}
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
  const { dict, locale } = useT();
  const b = dict.book;
  const preview = (location.state as BookPreviewState | null)?.preview;
  const { hash } = location;
  const query = useQuery({ ...catalogQueries.book(bookId), enabled: valid });
  const book = query.data;
  const shown: BookCard | undefined = book ?? (preview?.id === bookId ? preview : undefined);
  const showSkeleton = useSkeletonVisible(query.isPending && !shown);
  const recentOthers = useRecentlyViewed(bookId);
  const alsoBought = useQuery({ ...catalogQueries.alsoBought(bookId), enabled: valid });
  const primaryVariant = book?.variants?.[0];
  useDocumentTitle(shown?.title ?? (query.isError ? b.notFoundDoc : null), {
    description: book ? book.description || b.metaBy(book.title ?? "", (book.authors ?? []).map((a) => a.name).join(", ")) : null,
    image: shown?.cover_image_url,
    noindex: query.isError,
    type: "book",
    price: primaryVariant?.price_usd ? { amount: primaryVariant.price_usd, currency: "USD" } : null,
  });

  const jsonLdData = book
    ? {
        "@context": "https://schema.org",
        "@type": "Book",
        name: book.title,
        description: book.description || undefined,
        image: shown?.cover_image_url || undefined,
        author: (book.authors ?? []).map((a) => ({
          "@type": "Person",
          name: a.name,
        })),
        isbn: primaryVariant?.isbn || undefined,
        numberOfPages: book.page_count || undefined,
        bookFormat:
          primaryVariant?.format === "hardcover"
            ? "https://schema.org/Hardcover"
            : primaryVariant?.format === "ebook"
              ? "https://schema.org/EBook"
              : "https://schema.org/Paperback",
        ...(book.rating_avg && book.review_count
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: book.rating_avg,
                reviewCount: book.review_count,
              },
            }
          : {}),
        offers: {
          "@type": "Offer",
          price: primaryVariant?.price_usd ?? book.price_from_usd ?? "0.00",
          priceCurrency: "USD",
          availability:
            primaryVariant && primaryVariant.in_stock !== false
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: typeof window !== "undefined" ? window.location.href : undefined,
        },
      }
    : null;

  const firstAuthor = book?.authors?.[0];
  const byAuthor = useQuery({ ...catalogQueries.books({ author_id: firstAuthor?.id, per_page: 9 }), enabled: Boolean(firstAuthor?.id) });
  const series = useQuery({ ...catalogQueries.series(book?.series?.id ?? 0), enabled: Boolean(book?.series?.id) });

  useEffect(() => {
    if (book?.id) addRecentlyViewed(book.id);
  }, [book]);

  const notFound = !valid || (query.isError && ApiError.from(query.error).kind === "not_found");
  if (notFound) {
    return (
      <div className="container-shell py-16">
        <EmptyState
          icon={BookX}
          headingLevel="h1"
          title={b.notFound}
          description={b.notFoundLead}
          action={
            <Link to="/books" className={buttonVariants()}>
              {b.browseAll}
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

  return (
    <div className="container-shell pb-24 pt-6 sm:pt-8">
      <Breadcrumb
        items={[
          { label: b.home, to: "/" },
          { label: dict.catalog.title, to: "/books" },
          ...(category ? [{ label: category.name ?? "", to: `/categories/${category.slug}` }] : []),
          { label: shown?.title ?? b.book },
        ]}
      />

      {jsonLdData ? <JsonLd data={jsonLdData} /> : null}

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
                <BookCover src={shown.cover_image_url} title={shown.title} alt={b.cover(shown.title ?? "")} eager />
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
                  {b.by}{" "}
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
                    {book.series.order ? b.bookInSeries(book.series.order) : b.partOf}
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
          <TabsList aria-label={b.about}>
            <TabsTrigger value="description">{dict.bookDetail.description}</TabsTrigger>
            <TabsTrigger value="details">{dict.bookDetail.details}</TabsTrigger>
            <TabsTrigger value="reviews">
              {dict.bookDetail.reviews} ({book.review_count ?? 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <div className="max-w-prose whitespace-pre-line text-[17px] leading-8 text-foreground">{book.description || b.noDescription}</div>
          </TabsContent>
          <TabsContent value="details">
            <dl className="max-w-2xl text-[15px]">
              <Detail label={b.authors}>{authors.map((a) => a.name).join(", ")}</Detail>
              <Detail label={b.publisher}>
                {book.publisher ? (
                  <Link to={`/publishers/${book.publisher.id}`} className="underline-offset-4 hover:underline">
                    {book.publisher.name}
                  </Link>
                ) : null}
              </Detail>
              <Detail label={b.published}>{book.publish_date ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(book.publish_date)) : null}</Detail>
              <Detail label={b.language}>{book.language}</Detail>
              <Detail label={b.pages}>{book.page_count ? book.page_count.toLocaleString("en-US") : null}</Detail>
              <Detail label={b.formats}>{(book.variants ?? []).map((v) => formatName(dict, v.format)).join(", ")}</Detail>
              <Detail label={b.isbn}>
                {(book.variants ?? []).filter((v) => v.isbn).length ? (
                  <ul>
                    {(book.variants ?? []).filter((v) => v.isbn).map((v) => (
                      <li key={v.id} className="tabular-nums">
                        {v.isbn} <span className="text-muted-foreground">({formatName(dict, v.format)})</span>
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
          <BookShelf id="series" eyebrow={b.theSeries} title={book.series.name ?? b.inThisSeries} books={otherInSeries} seeAllHref={`/series/${book.series.id}`} seeAllLabel={b.wholeSeries} />
        ) : null}
        {firstAuthor ? (
          <BookShelf
            id="by-author"
            eyebrow={b.sameAuthor}
            title={b.moreBy(firstAuthor.name ?? "")}
            books={otherByAuthor}
            loading={byAuthor.isPending}
            seeAllHref={`/authors/${firstAuthor.id}`}
            seeAllLabel={b.aboutAuthor}
          />
        ) : null}
        {alsoBought.data?.length ? (
          <BookShelf
            id="also-bought"
            eyebrow={b.alsoBoughtEyebrow}
            title={b.alsoBought}
            books={alsoBought.data}
          />
        ) : null}
        <BookShelf
          id="recent"
          eyebrow={b.yourHistory}
          title={b.recentlyViewed}
          books={recentOthers}
          action={
            <Button variant="ghost" size="sm" onClick={clearRecentlyViewed}>
              {b.clearHistory}
            </Button>
          }
        />
      </div>
    </div>
  );
}
