import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, BookX, Check, ChevronLeft, ChevronRight, Expand, Heart, Loader2, RotateCcw, ShoppingCart, Truck, Wallet } from "lucide-react";
import bookService from "../../services/book.service";
import customerService from "../../services/customer.service";
import type { Book, BookReview } from "../../types/book.types";
import { getAccessToken, getStoredUser } from "../../lib/session";
import { alertModal, alertToast } from "../../lib/alerts";
import { loadFavorites, saveFavorites } from "../../lib/favorites";
import { formatOrderDate, formatPrice, toNumber } from "../../lib/format";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import { coverLayoutId, useCoverMorphNavigate, useMorphLayoutId, type BookPreview } from "../../lib/coverMorph";
import { MorphCover } from "../../components/MorphCover";
import BookCoverImage from "../../components/BookCoverImage";
import Modal from "../../components/ui/modal";
import { Button } from "../../components/ui/button";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CtaGlare } from "../../components/CtaGlare";
import { EmptyState } from "../../components/EmptyState";
import { QuantityStepper } from "../../components/QuantityStepper";
import { StarRating } from "../../components/StarRating";
import { StockBadge } from "../../components/BookBadge";
import { cn } from "@/lib/utils";

/*
 * /books/:id, the full product page (quick view stays for browsing).
 * Layout (MASTER 5/7 detail split): cover on a surface panel | title, rating, purchase
 * block, service notes, description. Then details + reviews (with a rating breakdown)
 * and a "More in this category" shelf. On small screens a sticky purchase bar appears
 * once the main Add to cart has scrolled out of view.
 */

type LoadState = "loading" | "ready" | "not-found" | "error";
type AddState = "idle" | "adding" | "added";

const MAX_PER_ORDER = 99;
const LONG_DESCRIPTION = 420;

const isCustomer = () => Boolean(getAccessToken()) && getStoredUser()?.role === "customer";

const DetailSkeleton = () => (
  <div aria-busy="true" className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16">
    <span className="sr-only">Loading book…</span>
    <div aria-hidden="true" className="rounded-xl bg-surface-2 p-8 lg:col-span-5"><div className="skeleton mx-auto aspect-[2/3] w-full max-w-[280px] rounded-sm" /></div>
    <div aria-hidden="true" className="grid content-start gap-4 lg:col-span-7">
      <div className="skeleton h-3 w-1/5 rounded-sm" />
      <div className="skeleton h-12 w-4/5 rounded-sm" />
      <div className="skeleton h-5 w-1/3 rounded-sm" />
      <div className="skeleton mt-4 h-40 w-full rounded-xl" />
      <div className="skeleton h-20 w-full rounded-sm" />
    </div>
  </div>
);

const RelatedItem = ({ book }: { book: Book }) => {
  const key = `related-${book.id}`;
  const layoutId = useMorphLayoutId(book.id, key);
  const morphTo = useCoverMorphNavigate();
  return (
    <li className="w-40 shrink-0 snap-start sm:w-44">
      <Link to={`/books/${book.id}`} onClick={(e) => morphTo(e, book, key)} className="group block rounded-lg">
        <MorphCover layoutId={layoutId} className="aspect-[2/3] overflow-hidden rounded-sm bg-surface-2 shadow-sm transition-[translate,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:shadow-lift motion-reduce:group-hover:translate-y-0">
          <BookCoverImage src={book.book_img} alt="" className="h-full w-full object-cover" iconClassName="h-6 w-6" />
        </MorphCover>
        <p className="mt-3 line-clamp-2 font-display text-base leading-snug text-foreground underline-offset-4 group-hover:underline">{book.title}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{book.author_name}</p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{formatPrice(book.price)}</p>
      </Link>
    </li>
  );
};

const RelatedShelf = ({ books, category }: { books: Book[]; category: string }) => {
  const scroller = useRef<HTMLUListElement>(null);
  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" });
  const navBtn = "grid h-11 w-11 place-items-center rounded-lg border border-input text-foreground transition-[background-color,scale] duration-150 hover:bg-secondary active:scale-95 motion-reduce:active:scale-100";
  return (
    <section aria-labelledby="related-title" className="mt-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Keep reading</p>
          <h2 id="related-title" className="mt-3 text-[clamp(1.75rem,3vw,2.45rem)] leading-tight text-foreground">More in {category}</h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" className={navBtn} onClick={() => scrollBy(-1)} aria-label={`Scroll ${category} books left`}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
          <button type="button" className={navBtn} onClick={() => scrollBy(1)} aria-label={`Scroll ${category} books right`}><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
        </div>
      </div>
      <ul ref={scroller} className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {books.map((book) => <RelatedItem key={book.id} book={book} />)}
      </ul>
    </section>
  );
};

/** The 5/12 cover column. Rendered identically while loading (from the preview carried in
 *  navigation state) and once loaded, so the morph lands in its final position. */
const CoverColumn = ({ bookId, src, title, onEnlarge }: { bookId: number; src: string; title: string; onEnlarge?: () => void }) => (
  <section aria-label="Cover" className="lg:col-span-5">
    <div className="lg:sticky lg:top-28">
      <div className="rounded-xl bg-surface-2 px-8 py-10 sm:px-12">
        <MorphCover layoutId={coverLayoutId(bookId)} className="mx-auto aspect-[2/3] w-full max-w-[300px] overflow-hidden rounded-sm shadow-overlay">
          <button
            type="button"
            onClick={onEnlarge}
            disabled={!onEnlarge}
            className="group relative block h-full w-full transition-[translate] duration-200 hover:-translate-y-1 active:scale-[0.99] disabled:cursor-default motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
            aria-label={`Enlarge the cover of ${title}`}
          >
            <BookCoverImage src={src} alt={`${title} cover`} className="h-full w-full object-cover" iconClassName="h-10 w-10" />
          </button>
        </MorphCover>
      </div>
      {onEnlarge ? (
        <button type="button" onClick={onEnlarge} className="mx-auto mt-3 flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground">
          <Expand className="h-4 w-4" aria-hidden="true" />
          View larger cover
        </button>
      ) : null}
    </div>
  </section>
);

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [book, setBook] = useState<Book | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [related, setRelated] = useState<Book[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addState, setAddState] = useState<AddState>("idle");
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const addedTimer = useRef<number | undefined>(undefined);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const showSkeleton = useSkeletonVisible(loadState === "loading");
  const preview = (location.state as { preview?: BookPreview } | null)?.preview;
  const matchingPreview = preview && String(preview.id) === id ? preview : undefined;

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  useEffect(() => {
    let active = true;
    const bookId = Number(id);
    setLoadState("loading");
    setBook(null);
    setReviews([]);
    setRelated([]);
    setQuantity(1);
    setAddState("idle");
    setExpanded(false);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      setLoadState("not-found");
      return;
    }

    bookService
      .getBook(bookId)
      .then((data) => {
        if (!active) return;
        setBook(data);
        setIsSaved(isCustomer() && loadFavorites().includes(data.id));
        setLoadState("ready");
        // Secondary content: failures here never take the page down.
        bookService.getBookReviews(bookId).then((list) => active && setReviews(list)).catch(() => undefined);
        if (data.category_id) {
          bookService
            .getBooks({ category_id: toNumber(data.category_id), limit: 9 })
            .then((res) => active && setRelated(res.data.filter((b) => toNumber(b.id) !== data.id).slice(0, 8)))
            .catch(() => undefined);
        }
      })
      .catch((error) => {
        if (!active) return;
        setLoadState(error?.response?.status === 404 ? "not-found" : "error");
      });

    return () => { active = false; };
  }, [id]);

  // Sticky purchase bar (small screens): visible only once the main purchase block has scrolled above the viewport.
  useEffect(() => {
    const target = purchaseRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, [book]);

  const ratingBreakdown = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => Math.round(toNumber(r.rating)) === stars).length }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return counts.map((c) => ({ ...c, width: (c.count / max) * 100 }));
  }, [reviews]);

  const stock = book?.stock;
  const isOutOfStock = stock !== undefined && stock <= 0;
  const maxQuantity = Math.max(1, Math.min(stock ?? MAX_PER_ORDER, MAX_PER_ORDER));

  const askToSignIn = async (title: string, text: string) => {
    const result = await alertModal.info({ title, text, confirmButtonText: "Sign in" });
    if (result.isConfirmed) navigate("/login", { state: { from: location.pathname } });
  };

  const handleAddToCart = async () => {
    if (!book || isOutOfStock || addState === "adding") return;
    if (!isCustomer()) return askToSignIn("Sign in to buy", "Sign in to your customer account to add books to your cart.");

    setAddState("adding");
    try {
      await customerService.addCartItem(book.id, quantity);
      setAddState("added");
      window.clearTimeout(addedTimer.current);
      addedTimer.current = window.setTimeout(() => setAddState("idle"), 2000);
      const viewCart = await alertToast.withAction("success", "Added to cart", `${quantity} × ${book.title}`, "View cart");
      if (viewCart) navigate("/cart");
    } catch (error: any) {
      setAddState("idle");
      alertToast.error("Couldn't add to cart", error?.response?.data?.message || "Try again in a moment.");
    }
  };

  const toggleSaved = async () => {
    if (!book) return;
    if (!isCustomer()) return askToSignIn("Sign in to save books", "Your wishlist is kept on your account, so sign in first.");
    const current = loadFavorites();
    if (current.includes(book.id)) {
      saveFavorites(current.filter((fid) => fid !== book.id));
      setIsSaved(false);
      const undo = await alertToast.withAction("success", "Removed from wishlist", book.title, "Undo");
      if (undo) { saveFavorites([...loadFavorites().filter((fid) => fid !== book.id), book.id]); setIsSaved(true); }
    } else {
      saveFavorites([...current, book.id]);
      setIsSaved(true);
      const view = await alertToast.withAction("success", "Saved to wishlist", book.title, "View wishlist");
      if (view) navigate("/favorites");
    }
  };

  if (loadState === "not-found" || loadState === "error") {
    return (
      <div className="section-wrap py-10">
        <EmptyState
          icon={BookX}
          headingLevel="h1"
          title={loadState === "not-found" ? "We can't find that book" : "This book didn't load"}
          description={loadState === "not-found" ? "It may have been removed from the catalogue, or the link is wrong." : "Check your connection and try again."}
          action={loadState === "error" ? <Button onClick={() => window.location.reload()}>Try again</Button> : <Button asChild><Link to="/browse">Browse books</Link></Button>}
        />
      </div>
    );
  }

  if (!book) {
    // Arriving from a card: show the real cover straight away (the morph's landing spot)
    // and skeleton only the text column.
    if (matchingPreview) {
      return (
        <div className="section-wrap pb-24 pt-8 lg:pb-16 lg:pt-10" aria-busy="true">
          <div className="skeleton h-11 w-72 max-w-full rounded-sm" aria-hidden="true" />
          <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <CoverColumn bookId={matchingPreview.id} src={matchingPreview.book_img} title={matchingPreview.title} />
            <div className="grid content-start gap-4 lg:col-span-7">
              <span className="sr-only">Loading {matchingPreview.title}…</span>
              {matchingPreview.category_name ? <p className="eyebrow">{matchingPreview.category_name}</p> : null}
              <h1 className="text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">{matchingPreview.title}</h1>
              <div aria-hidden="true" className="skeleton mt-4 h-40 w-full rounded-xl" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="section-wrap py-8 lg:py-12">
        <div className="skeleton h-11 w-72 max-w-full rounded-sm" aria-hidden="true" />
        {showSkeleton ? <DetailSkeleton /> : null}
      </div>
    );
  }

  const published = formatOrderDate(book.published_date);
  const description = book.description?.trim() ?? "";
  const isLong = description.length > LONG_DESCRIPTION;
  const addLabel = addState === "adding" ? "Adding…" : addState === "added" ? "Added to cart" : isOutOfStock ? "Out of stock" : "Add to cart";
  const addIcon = addState === "adding" ? <Loader2 className="animate-spin" aria-hidden="true" /> : addState === "added" ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />;

  return (
    <div className="section-wrap pb-24 pt-8 lg:pb-16 lg:pt-10">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Shop", to: "/browse" },
          ...(book.category_name ? [{ label: book.category_name, to: `/browse?search=${encodeURIComponent(book.category_name)}` }] : []),
          { label: book.title },
        ]}
      />

      {/* ---------- Product ---------- */}
      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <CoverColumn bookId={book.id} src={book.book_img} title={book.title} onEnlarge={() => setIsEnlarged(true)} />

        <section aria-labelledby="book-title" className="lg:col-span-7">
          {book.category_name ? <p className="eyebrow">{book.category_name}</p> : null}
          <h1 id="book-title" className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">{book.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            by{" "}
            <Link to={`/browse?search=${encodeURIComponent(book.author_name)}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
              {book.author_name}
            </Link>
          </p>
          <a href="#reviews" className="mt-3 inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:underline">
            <StarRating value={book.average_rating} count={book.review_count} />
          </a>

          {/* Purchase block */}
          <div ref={purchaseRef} className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-[2rem] font-semibold leading-none tabular-nums text-foreground">{formatPrice(book.price)}</p>
              {stock !== undefined && stock > 5 ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                  In stock
                </span>
              ) : (
                <StockBadge stock={stock} />
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <QuantityStepper label={`Quantity of ${book.title}`} showLabel value={quantity} onChange={setQuantity} min={1} max={maxQuantity} disabled={isOutOfStock || addState === "adding"} />
              <CtaGlare className="min-w-0 flex-1">
                <Button type="button" variant="cta" size="lg" className="w-full" onClick={() => void handleAddToCart()} disabled={isOutOfStock || addState === "adding"} aria-busy={addState === "adding"}>
                  {addIcon}
                  {addLabel}
                </Button>
              </CtaGlare>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                onClick={() => void toggleSaved()}
                aria-pressed={isSaved}
                aria-label={isSaved ? `Remove ${book.title} from wishlist` : `Save ${book.title} to wishlist`}
                className={cn(isSaved && "border-accent-text text-accent-text")}
              >
                <Heart className={cn(isSaved && "fill-current")} aria-hidden="true" />
              </Button>
            </div>
            <p className="sr-only" aria-live="polite">{addState === "added" ? `${quantity} added to your cart.` : ""}</p>
            {isOutOfStock ? <p className="mt-3 text-sm text-muted-foreground">Sold out right now. Save it to your wishlist and check back soon.</p> : null}

            <ul className="mt-6 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-3">
              {[
                { Icon: Wallet, text: "Cash on delivery available" },
                { Icon: Truck, text: "Delivery across Cambodia" },
                { Icon: RotateCcw, text: "Returns on delivered orders" },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-muted-foreground">
                  <Icon className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {description ? (
            <div className="mt-8">
              <h2 className="text-[1.563rem] leading-tight text-foreground">About this book</h2>
              <p id="book-description" className={cn("mt-3 max-w-[65ch] whitespace-pre-line text-base leading-7 text-foreground", isLong && !expanded && "line-clamp-5")}>
                {description}
              </p>
              {isLong ? (
                <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-controls="book-description" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                  {expanded ? "Show less" : "Read more"}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {/* ---------- Details + reviews ---------- */}
      <div className="mt-16 grid gap-8 border-t border-border pt-12 lg:grid-cols-12 lg:gap-16">
        <section aria-labelledby="details-title" className="lg:col-span-5">
          <h2 id="details-title" className="text-[clamp(1.75rem,3vw,2.45rem)] leading-tight text-foreground">Details</h2>
          <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-card text-base">
            {[
              ["Author", book.author_name],
              ["Category", book.category_name],
              ["Published", published],
              ["Availability", isOutOfStock ? "Out of stock" : stock !== undefined && stock <= 5 ? `Only ${stock} left` : "In stock"],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 px-5 py-3.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium text-foreground">{value}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28 lg:col-span-7">
          <h2 id="reviews-title" className="text-[clamp(1.75rem,3vw,2.45rem)] leading-tight text-foreground">Reader reviews</h2>
          {reviews.length === 0 ? (
            <p className="mt-4 text-base text-muted-foreground">No reviews yet. Readers who buy this book can review it from the quick view in the shop.</p>
          ) : (
            <>
              <div className="mt-5 grid gap-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="text-center sm:pr-6">
                  <p className="font-display text-5xl leading-none tabular-nums text-foreground">{toNumber(book.average_rating).toFixed(1)}</p>
                  <StarRating value={book.average_rating} summary={false} className="mt-2 justify-center" />
                  <p className="mt-1 text-sm text-muted-foreground"><span className="tabular-nums">{reviews.length}</span> {reviews.length === 1 ? "review" : "reviews"}</p>
                </div>
                <ul className="grid gap-1.5" aria-label="Rating breakdown">
                  {ratingBreakdown.map(({ stars, count, width }) => (
                    <li key={stars} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{stars} star{stars === 1 ? "" : "s"}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true"><span className="block h-full rounded-full bg-star" style={{ width: `${width}%` }} /></span>
                      <span className="text-right tabular-nums text-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="mt-6 grid gap-4">
                {reviews.map((review) => (
                  <li key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{review.customer_name}</p>
                      <StarRating value={toNumber(review.rating)} summary={false} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {formatOrderDate(review.created_at)}
                      {review.is_verified_purchase ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-success"><BadgeCheck className="h-4 w-4" aria-hidden="true" />Verified purchase</span>
                      ) : null}
                    </p>
                    {review.comment ? <p className="mt-2 max-w-[65ch] text-base leading-7 text-foreground">{review.comment}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {related.length > 0 && book.category_name ? <RelatedShelf books={related} category={book.category_name} /> : null}

      {/* Sticky purchase bar for small screens */}
      {showStickyBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-overlay lg:hidden" role="region" aria-label="Quick purchase">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{book.title}</p>
              <p className="text-sm tabular-nums text-muted-foreground">{formatPrice(book.price)}{quantity > 1 ? ` × ${quantity}` : ""}</p>
            </div>
            <Button type="button" variant="cta" onClick={() => void handleAddToCart()} disabled={isOutOfStock || addState === "adding"} aria-busy={addState === "adding"}>
              {addIcon}
              {addLabel}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal isOpen={isEnlarged} onClose={() => setIsEnlarged(false)} title={book.title} maxWidthClass="max-w-xl">
        <div className="mx-auto aspect-[2/3] w-full max-w-md overflow-hidden rounded-sm bg-surface-2">
          <BookCoverImage src={book.book_img} alt={`${book.title} cover, enlarged`} className="h-full w-full object-contain" iconClassName="h-12 w-12" />
        </div>
      </Modal>
    </div>
  );
};

export default BookDetail;
