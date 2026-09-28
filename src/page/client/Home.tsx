import { useEffect, useMemo, useState, type FocusEvent, type KeyboardEvent } from "react";
import { AlertTriangle, ArrowRight, BookOpenText, Eye, ChevronLeft, ChevronRight, Flame, Layers, Pause, Play, TrendingUp } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Loading from "../../components/ui/loading";
import Modal from "../../components/ui/modal";
import BookDetailModal from "../../components/BookDetailModal";
import BookCoverImage from "../../components/BookCoverImage";
import bookService from "../../services/book.service";
import customerService from "../../services/customer.service";
import type { Book, BookCategory } from "../../types/book.types";
import { books as fallbackBooksSource, type StaticBook } from "../../components/data/book";
import { consumePendingWelcome } from "../../lib/customer";
import { getAccessToken, getStoredUser } from "../../lib/session";
import { useStorefrontSettings } from "../../contexts/StorefrontSettingsContext";
import BlurText from "../../components/BlurText";
import CountUp from "../../components/CountUp";
import SpotlightCard from "../../components/SpotlightCard";
import Carousel from "../../components/Carousel";
import GlareHover from "../../components/GlareHover";
import AnimatedContent from "../../components/AnimatedContent";
import { MorphCover } from "../../components/MorphCover";
import { Button } from "../../components/ui/button";
import { useCoverMorphNavigate, useMorphLayoutId } from "../../lib/coverMorph";
import { formatPrice } from "../../lib/format";
import { alertModal, alertToast } from "../../lib/alerts";

const fallbackBooks: Book[] = (fallbackBooksSource as StaticBook[]).map((book) => ({
  id: book.id,
  title: book.title,
  description: "Featured selection available while the API is offline.",
  price: Number(book.price),
  stock: 1,
  author_name: book.author,
  published_date: book.published_date,
  book_img: book.book_img,
  category_name: book.genre,
}));

const fallbackCategories: BookCategory[] = Array.from(
  new Map(
    fallbackBooks.map((book, index) => [
      book.category_name,
      { id: index + 1, name: book.category_name },
    ]),
  ).values(),
);

// Shelf card (MASTER §6.12): cover + title link to /books/:id with the shared cover morph
// (instance key is per shelf, so the same book in two shelves stays unique); Quick view is
// an explicit button that opens the existing modal.
const ShelfCard = ({ book, shelf, onQuickView }: { book: Book; shelf: string; onQuickView: (book: Book) => void }) => {
  const instanceKey = `shelf-${shelf}-${book.id}`;
  const layoutId = useMorphLayoutId(book.id, instanceKey);
  const morphTo = useCoverMorphNavigate();
  return (
    <SpotlightCard className="group w-[200px] shrink-0 rounded-xl border border-border bg-card p-3 transition-[box-shadow,translate] duration-150 hover:-translate-y-1 hover:shadow-lift motion-reduce:hover:translate-y-0">
      <div className="relative">
        <Link to={`/books/${book.id}`} onClick={(e) => morphTo(e, book, instanceKey)} tabIndex={-1} aria-hidden="true" className="block">
          <MorphCover layoutId={layoutId} className="aspect-[2/3] overflow-hidden rounded-sm bg-surface-2">
            <BookCoverImage src={book.book_img} alt="" className="h-full w-full object-cover" iconClassName="h-8 w-8" />
          </MorphCover>
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onQuickView(book)}
          aria-label={`Quick view: ${book.title}`}
          className="absolute inset-x-2 bottom-2 bg-card/95 opacity-0 shadow-sm transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden"
        >
          <Eye aria-hidden="true" />
          Quick view
        </Button>
      </div>
      <p className="mt-3 line-clamp-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">{book.category_name}</p>
      <h3 className="mt-1.5 font-sans text-[1.125rem] font-semibold leading-snug tracking-normal">
        <Link to={`/books/${book.id}`} onClick={(e) => morphTo(e, book, instanceKey)} className="line-clamp-2 min-h-[2.75em] text-foreground underline-offset-4 hover:underline">
          {book.title}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-1 text-sm font-medium text-muted-foreground">by {book.author_name}</p>
      <p className="mt-3 border-t border-border pt-2.5 text-base font-semibold tabular-nums text-foreground">{formatPrice(book.price)}</p>
    </SpotlightCard>
  );
};

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useStorefrontSettings();
  const [books, setBooks] = useState<Book[]>([]);
  const [bookCategory, setBookCategory] = useState<BookCategory[]>([]);
  const [newArrivals, setNewArrivals] = useState<Book[]>([]);
  const [bestSellers, setBestSellers] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [isHeroFocused, setIsHeroFocused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const pendingWelcome = consumePendingWelcome();
    if (pendingWelcome) {
      setWelcomeMessage(pendingWelcome);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [booksRes, categoryRes, newArrivalsRes, bestSellersRes] = await Promise.allSettled([
          bookService.getBooks(),
          bookService.getBookCategories(),
          bookService.getNewArrivals(),
          bookService.getBestSellers(),
        ]);

        const booksData = booksRes.status === "fulfilled" ? [...booksRes.value.data].sort((a, b) => a.id - b.id) : fallbackBooks;
        const categoryData = categoryRes.status === "fulfilled" ? categoryRes.value.data : fallbackCategories;
        const newArrivalsData = newArrivalsRes.status === "fulfilled" ? newArrivalsRes.value.data : booksData.slice(0, 10);
        const bestSellersData = bestSellersRes.status === "fulfilled" ? bestSellersRes.value.data : booksData.slice(0, 10);

        setBooks(booksData);
        setBookCategory(categoryData);
        setNewArrivals(newArrivalsData);
        setBestSellers(bestSellersData);

        const hasApiFailure = [booksRes, categoryRes, newArrivalsRes, bestSellersRes].some(
          (result) => result.status === "rejected",
        );

        if (hasApiFailure) {
          setError("API server is unavailable. Showing bundled homepage data.");
        }
      } catch (fetchError) {
        console.error(fetchError);
        setBooks(fallbackBooks);
        setBookCategory(fallbackCategories);
        setNewArrivals(fallbackBooks.slice(0, 10));
        setBestSellers(fallbackBooks.slice(0, 10));
        setError("API server is unavailable. Showing bundled homepage data.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const heroBooks = useMemo(() => books.slice(0, 5), [books]);

  useEffect(() => {
    if (!heroBooks.length) {
      setCurrentHeroIndex(0);
      return;
    }

    setCurrentHeroIndex((prev) => (prev >= heroBooks.length ? 0 : prev));
  }, [heroBooks]);

  // Hero slideshow: 5.5s autoplay that stops for the pause button, hover, keyboard focus,
  // and reduced motion (MASTER §5, §7).
  const isHeroAutoplaying = heroBooks.length > 1 && !reduceMotion && !isHeroPaused && !isHeroHovered && !isHeroFocused;

  useEffect(() => {
    if (!isHeroAutoplaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroBooks.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isHeroAutoplaying, heroBooks.length]);

  const showHeroSlide = (step: number) => {
    if (!heroBooks.length) return;
    setCurrentHeroIndex((prev) => (prev + step + heroBooks.length) % heroBooks.length);
  };

  const handleHeroKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showHeroSlide(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showHeroSlide(1);
    }
  };

  const handleHeroBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsHeroFocused(false);
    }
  };

  const currentHeroBook = heroBooks[currentHeroIndex];

  const handleOpenBookDetail = (book: Book) => {
    setSelectedBook(book);
    setIsDetailModalOpen(true);
  };

  const handleAddToCart = async (book: Book) => {
    if (!getAccessToken() || getStoredUser()?.role !== "customer") {
      const result = await alertModal.info({
        title: "Login required",
        text: "Please login as a customer before adding books to your cart.",
        confirmButtonText: "Go to Login",
      });
      if (result.isConfirmed) {
        navigate("/login");
      }
      return;
    }

    try {
      await customerService.addCartItem(book.id, 1);
      const viewCart = await alertToast.withAction("success", "Added to cart", book.title, "View cart");
      if (viewCart) navigate("/cart");
    } catch (error: any) {
      alertToast.error("Unable to add to cart", error?.response?.data?.message || "Please try again.");
    }
  };

  const renderShelf = (id: string, title: string, lead: string, Icon: typeof Flame, shelfBooks: Book[]) => (
    <AnimatedContent distance={32} duration={0.7} threshold={0.15}>
      <section id={id} className="scroll-mt-32" aria-labelledby={`${id}-title`}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id={`${id}-title`} className="flex items-center gap-3 text-foreground">
              <Icon className="h-6 w-6 shrink-0 text-accent-text" aria-hidden="true" />
              {title}
            </h2>
            <p className="mt-2 text-muted-foreground">{lead}</p>
          </div>
          <Link
            to="/browse"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-input px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-surface-2"
          >
            Browse all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="overflow-x-auto pb-3 [scrollbar-width:thin] [scrollbar-color:var(--color-primary)_transparent]">
          <div className="flex min-w-max gap-6 pr-2">
            {shelfBooks.slice(0, 10).map((book) => <ShelfCard key={`${id}-${book.id}`} book={book} shelf={id} onQuickView={handleOpenBookDetail} />)}
          </div>
        </div>
      </section>
    </AnimatedContent>
  );

  if (isLoading) {
    return (
      <div className="section-wrap py-10">
        <Loading />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-clip">
      <div className="section-wrap py-6 lg:py-10 space-y-16">
        {error && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-warning bg-warning/10 px-4 py-3 text-sm font-medium text-warning"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Hero (MASTER §2.1a): inset lapis panel in Daylight, full-bleed band in Night. */}
        <section id="home-hero" className="hero-lapis dark:ml-[calc(50%-50vw)] dark:w-screen" aria-labelledby="home-hero-title">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-12 lg:gap-x-16 lg:px-12 lg:py-16">
            <div className="lg:col-span-7">
              <p className="eyebrow">Reader's Spotlight</p>
              <h1 id="home-hero-title" className="type-display mt-4 text-on-lapis">
                <BlurText
                  as="span"
                  text={settings.hero_heading}
                  delay={60}
                  animateBy="words"
                  animationFrom={{ filter: "blur(8px)", opacity: 0, y: 24 }}
                  animationTo={[{ filter: "blur(0px)", opacity: 1, y: 0 }]}
                  stepDuration={0.7}
                  easing={[0.16, 1, 0.3, 1]}
                />
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-[1.6] text-on-lapis-muted">
                {settings.hero_subheading}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {/* The one vermilion CTA on this view — the only GlareHover (MASTER §1, §5). */}
                <GlareHover
                  width="auto"
                  height="auto"
                  background="transparent"
                  borderColor="transparent"
                  borderRadius="var(--radius-lg)"
                  glareColor="#FFFFFF"
                  glareOpacity={0.35}
                  glareAngle={-30}
                  transitionDuration={700}
                  className="border-0"
                >
                  <Link
                    to="/browse"
                    className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-accent-foreground transition-[filter,scale] duration-150 hover:brightness-105 active:scale-[0.97] motion-reduce:active:scale-100"
                  >
                    Browse Products
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </GlareHover>
                <Link
                  to="/favorites"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-on-lapis-muted px-6 text-base font-semibold text-on-lapis transition-colors duration-150 hover:bg-on-lapis/10"
                >
                  View Favorites
                </Link>
              </div>

              <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-on-lapis-muted/70 pt-4">
                {[
                  { label: "Books", value: books.length },
                  { label: "Categories", value: bookCategory.length },
                  { label: "Trending", value: bestSellers.length },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-on-lapis-muted">{stat.label}</dt>
                    <dd className="mt-2 text-3xl font-semibold tabular-nums text-gold">
                      <CountUp to={stat.value} duration={1.2} />
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-on-lapis-muted">
                <span>Cash on delivery available</span>
                <span aria-hidden="true">·</span>
                <span>Delivery across Cambodia</span>
                <span aria-hidden="true">·</span>
                <span>Support: {settings.support_phone || settings.support_email}</span>
              </p>
            </div>

            {heroBooks.length > 0 && currentHeroBook && (
              <div
                className="lg:col-span-5"
                role="region"
                aria-roledescription="carousel"
                aria-label="Featured books"
                tabIndex={0}
                onKeyDown={handleHeroKeyDown}
                onMouseEnter={() => setIsHeroHovered(true)}
                onMouseLeave={() => setIsHeroHovered(false)}
                onFocus={() => setIsHeroFocused(true)}
                onBlur={handleHeroBlur}
              >
                <div className="mx-auto w-full max-w-[280px]">
                  <Carousel
                    fluid
                    loop
                    rotate={24}
                    showIndicators={false}
                    index={currentHeroIndex}
                    onIndexChange={setCurrentHeroIndex}
                    className="aspect-[2/3] rounded-sm border-0 bg-surface-2 shadow-overlay"
                    slides={heroBooks.map((book) => (
                      <div key={`hero-feature-${book.id}`} className="h-full w-full select-none pointer-events-none">
                        <BookCoverImage src={book.book_img} alt={`${book.title} cover`} className="h-full w-full object-cover" iconClassName="h-8 w-8" />
                      </div>
                    ))}
                  />

                  <div className="mt-8 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => showHeroSlide(-1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-on-lapis-muted text-on-lapis transition-colors duration-150 hover:bg-on-lapis/10"
                      aria-label="Previous featured book"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <div className="flex items-center gap-2" aria-hidden="true">
                      {heroBooks.map((book, index) => (
                        <span
                          key={`hero-dot-${book.id}`}
                          className={`h-2 rounded-full transition-all duration-200 ${index === currentHeroIndex ? "w-6 bg-gold" : "w-2 bg-on-lapis-muted/50"}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => showHeroSlide(1)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-on-lapis-muted text-on-lapis transition-colors duration-150 hover:bg-on-lapis/10"
                        aria-label="Next featured book"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {!reduceMotion && heroBooks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIsHeroPaused((prev) => !prev)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-on-lapis-muted text-on-lapis transition-colors duration-150 hover:bg-on-lapis/10"
                          aria-label={isHeroPaused ? "Play slideshow" : "Pause slideshow"}
                        >
                          {isHeroPaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-center" aria-live={isHeroAutoplaying ? "off" : "polite"} aria-atomic="true">
                    <p className="text-sm font-medium text-on-lapis">
                      <span className="tabular-nums text-on-lapis-muted">{currentHeroIndex + 1} of {heroBooks.length}</span>
                      <span className="text-on-lapis-muted" aria-hidden="true"> · </span>
                      {currentHeroBook.title}
                    </p>
                    <p className="text-sm text-on-lapis-muted">
                      by {currentHeroBook.author_name} ·{" "}
                      <span className="font-semibold tabular-nums text-gold">${Number(currentHeroBook.price).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {renderShelf("new-arrivals", "New Arrivals", "Highlights the newest products added to the store.", Flame, newArrivals)}

        {renderShelf("popular", "Best-sellers / Popular", "Popular picks readers are buying the most right now.", TrendingUp, bestSellers)}

        <AnimatedContent distance={32} duration={0.7} threshold={0.15}>
          <section id="catalogue" className="scroll-mt-32 rounded-xl border border-border bg-card p-6 md:p-8" aria-labelledby="catalogue-title">
            <p className="eyebrow">Curated Collection</p>
            <h2 id="catalogue-title" className="mt-4 text-foreground">Book Catalogue</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Discover books by category, theme, and popularity with our curated collections.
            </p>

            <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { label: "Books", value: books.length, Icon: BookOpenText },
                { label: "Categories", value: bookCategory.length, Icon: Layers },
                { label: "Best Sellers", value: bestSellers.length, Icon: TrendingUp },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="rounded-lg border border-border bg-surface-2 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
                  <dd className="mt-2 flex items-center gap-2 text-3xl font-semibold tabular-nums text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <CountUp to={value} duration={1.2} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </AnimatedContent>

        <AnimatedContent distance={32} duration={0.7} threshold={0.15}>
          <section id="help" className="scroll-mt-32 rounded-xl border border-border bg-card p-6 md:p-8" aria-labelledby="help-title">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="eyebrow">Need Help?</p>
                <h2 id="help-title" className="mt-4 text-foreground">Support, Orders, and Account Assistance</h2>
                <p className="mt-2 text-muted-foreground">
                  Our team can help with purchases, order status, and account issues at {settings.support_email}
                  {settings.support_phone ? ` or ${settings.support_phone}` : ""}.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row">
                <Link to="/login" className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/90">
                  Contact Support
                </Link>
                <Link to="/browse" className="inline-flex h-11 items-center rounded-lg border border-input px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-surface-2">
                  Browse Products
                </Link>
              </div>
            </div>
          </section>
        </AnimatedContent>
      </div>

      <BookDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        book={selectedBook}
        onAddToCart={handleAddToCart}
      />

      <Modal
        isOpen={Boolean(welcomeMessage)}
        onClose={() => setWelcomeMessage("")}
        title="Welcome to Bookly"
        maxWidthClass="max-w-md"
        bodyClassName="p-6 text-center space-y-4"
      >
        <p className="text-base text-foreground/80">{welcomeMessage}</p>
        <button
          onClick={() => setWelcomeMessage("")}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors duration-150"
        >
          Start Exploring
        </button>
      </Modal>
    </div>
  );
};

export default Home;
