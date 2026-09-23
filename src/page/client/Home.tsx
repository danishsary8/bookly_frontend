import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenText, Flame, Layers, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
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
  const currentHeroBook = heroBooks[currentHeroIndex] ?? heroBooks[0] ?? null;

  useEffect(() => {
    if (!heroBooks.length) {
      setCurrentHeroIndex(0);
      return;
    }

    setCurrentHeroIndex((prev) => (prev >= heroBooks.length ? 0 : prev));
  }, [heroBooks]);

  useEffect(() => {
    if (heroBooks.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroBooks.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [heroBooks]);

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
      alertToast.success("Added to cart", book.title);
    } catch (error: any) {
      alertToast.error("Unable to add to cart", error?.response?.data?.message || "Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="section-wrap py-10">
        <Loading />
      </div>
    );
  }

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-10">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-accent"
          >
            {error}
          </motion.div>
        )}

        <section id="home-hero">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border/50 bg-card shadow-sm p-6 md:p-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-primary font-bold">Reader's Spotlight</p>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-3 leading-tight">
                  {settings.hero_heading}
                </h1>
                <p className="mt-4 text-sm md:text-base text-foreground/70 max-w-2xl">
                  {settings.hero_subheading}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-sm-lg"
                  >
                    Browse Products
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/favorites"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border/60 bg-background text-foreground text-sm font-medium hover:bg-background/80 transition-all duration-200"
                  >
                    View Favorites
                  </Link>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/40 bg-background/60 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-foreground/60 font-semibold">Books</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{books.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/60 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-foreground/60 font-semibold">Categories</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{bookCategory.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/60 px-4 py-3 col-span-2 sm:col-span-1">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-foreground/60 font-semibold">Trending</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{bestSellers.length}</p>
                  </div>
                </div>

                <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900">
                  <span>Cash on delivery available</span>
                  <span className="text-sky-600/70">|</span>
                  <span>Delivery across Cambodia</span>
                  <span className="text-sky-600/70">|</span>
                  <span>Support: {settings.support_phone || settings.support_email}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-background/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-primary font-bold">Featured Spotlight</p>
                  <div className="flex items-center gap-1.5">
                    {heroBooks.map((book, index) => (
                      <button
                        key={`hero-dot-${book.id}`}
                        type="button"
                        onClick={() => setCurrentHeroIndex(index)}
                        className={`h-2.5 rounded-full transition-all duration-200 ${index === currentHeroIndex ? "w-6 bg-primary" : "w-2.5 bg-primary/25 hover:bg-primary/40"}`}
                        aria-label={`Show featured book ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {currentHeroBook && (
                  <motion.div
                    key={`hero-feature-${currentHeroBook.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mt-4 space-y-4"
                  >
                    <div className="relative h-72 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
                      <BookCoverImage src={currentHeroBook.book_img} alt={currentHeroBook.title} author={currentHeroBook.author_name} className="h-full w-full object-cover" iconClassName="h-8 w-8" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-5 text-white">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">{currentHeroBook.category_name}</p>
                        <h3 className="mt-2 text-2xl font-bold leading-tight">{currentHeroBook.title}</h3>
                        <p className="mt-1 text-sm text-white/75">by {currentHeroBook.author_name}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-white/70">Featured price</span>
                          <span className="text-xl font-bold text-amber-300">${Number(currentHeroBook.price).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {heroBooks.map((book, index) => (
                        <button
                          key={`hero-thumb-${book.id}`}
                          type="button"
                          onClick={() => setCurrentHeroIndex(index)}
                          className={`relative overflow-hidden rounded-xl border bg-card transition-all duration-200 ${index === currentHeroIndex ? "border-primary shadow-sm" : "border-border/50 hover:border-border/80"}`}
                        >
                          <div className="relative h-20">
                            <BookCoverImage src={book.book_img} alt={book.title} author={book.author_name} className="h-full w-full object-cover" iconClassName="h-5 w-5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="new-arrivals" className="mb-6 scroll-mt-32">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" />
                New Arrivals
              </h3>
              <p className="text-sm text-foreground/70 mt-1">
                Highlights the newest products added to the store.
              </p>
            </div>
            <Link
              to="/browse"
              className="shrink-0 h-10 px-4 rounded-lg bg-card border border-border/50 text-sm font-medium text-foreground hover:bg-background/80 transition-all duration-200 inline-flex items-center gap-1.5"
            >
              Browse all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:var(--color-primary)_transparent]">
            <div className="flex gap-4 min-w-max pr-2">
              {newArrivals.slice(0, 10).map((book, idx) => (
                <motion.article
                  key={`arrival-${book.id}`}
                  onClick={() => handleOpenBookDetail(book)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="w-[280px] shrink-0 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-3.5"
                >
                  <div className="relative h-40 rounded-lg overflow-hidden bg-background/60 flex items-center justify-center border border-border/40">
                    <BookCoverImage src={book.book_img} alt={book.title} author={book.author_name} className="h-full w-auto object-contain" iconClassName="h-8 w-8" />
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.1em] font-bold text-primary">{book.category_name}</p>
                  <h4 className="mt-1.5 text-base font-bold text-foreground line-clamp-2 min-h-[2.8rem]">{book.title}</h4>
                  <p className="text-sm text-foreground/70 line-clamp-1 mt-1">by {book.author_name}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                    <span className="text-xs text-foreground/60 uppercase tracking-[0.1em] font-medium">Price</span>
                    <span className="text-lg font-bold text-accent">${Number(book.price).toFixed(2)}</span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="popular" className="mb-6 scroll-mt-32">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Best-sellers / Popular
              </h3>
              <p className="text-sm text-foreground/70 mt-1">
                Popular picks readers are buying the most right now.
              </p>
            </div>
            <Link
              to="/browse"
              className="shrink-0 h-10 px-4 rounded-lg bg-card border border-border/50 text-sm font-medium text-foreground hover:bg-background/80 transition-all duration-200 inline-flex items-center gap-1.5"
            >
              Browse all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:var(--color-primary)_transparent]">
            <div className="flex gap-4 min-w-max pr-2">
              {bestSellers.slice(0, 10).map((book, idx) => (
                <motion.article
                  key={`popular-${book.id}`}
                  onClick={() => handleOpenBookDetail(book)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="w-[280px] shrink-0 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-3.5"
                >
                  <div className="relative h-40 rounded-lg overflow-hidden bg-background/60 flex items-center justify-center border border-border/40">
                    <BookCoverImage src={book.book_img} alt={book.title} author={book.author_name} className="h-full w-auto object-contain" iconClassName="h-8 w-8" />
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.1em] font-bold text-primary">{book.category_name}</p>
                  <h4 className="mt-1.5 text-base font-bold text-foreground line-clamp-2 min-h-[2.8rem]">{book.title}</h4>
                  <p className="text-sm text-foreground/70 line-clamp-1 mt-1">by {book.author_name}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                    <span className="text-xs text-foreground/60 uppercase tracking-[0.1em] font-medium">Price</span>
                    <span className="text-lg font-bold text-accent">${Number(book.price).toFixed(2)}</span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="catalogue" className="rounded-2xl border border-border/50 bg-card shadow-sm p-6 md:p-8 scroll-mt-32">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-primary font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Curated Collection
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Book Catalogue</h2>
          <p className="text-sm text-foreground/70 mt-3 max-w-xl">
            Discover books by category, theme, and popularity with our curated collections.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-background/50 border border-border/40 p-4">
              <p className="text-xs uppercase text-foreground/60 font-semibold tracking-[0.1em]">Books</p>
              <p className="mt-2 text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpenText className="h-5 w-5 text-primary" />
                {books.length}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 border border-border/40 p-4">
              <p className="text-xs uppercase text-foreground/60 font-semibold tracking-[0.1em]">Categories</p>
              <p className="mt-2 text-2xl font-bold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {bookCategory.length}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 border border-border/40 p-4">
              <p className="text-xs uppercase text-foreground/60 font-semibold tracking-[0.1em]">Best Sellers</p>
              <p className="mt-2 text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {bestSellers.length}
              </p>
            </div>
          </div>
        </section>

        <section id="help" className="rounded-2xl border border-border/50 bg-card shadow-sm p-6 md:p-8 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-primary font-bold">Need Help?</p>
              <h3 className="text-2xl font-bold text-foreground mt-2">Support, Orders, and Account Assistance</h3>
              <p className="text-foreground/70 mt-2 text-sm">
                Our team can help with purchases, order status, and account issues at {settings.support_email}
                {settings.support_phone ? ` or ${settings.support_phone}` : ""}.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link to="/login" className="h-10 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center transition-all duration-200 shadow-sm hover:shadow-sm-lg">
                Contact Support
              </Link>
              <Link to="/browse" className="h-10 px-5 rounded-lg text-sm font-medium border border-border/50 text-foreground hover:bg-background/80 inline-flex items-center transition-all duration-200">
                Browse Products
              </Link>
            </div>
          </div>
        </section>
      </main>

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
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-sm-lg"
        >
          Start Exploring
        </button>
      </Modal>
    </div>
  );
};

export default Home;
