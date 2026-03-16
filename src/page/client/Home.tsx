import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenText, Flame, Layers, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import Cookies from "js-cookie";

import Loading from "../../components/ui/loading";
import BookDetailModal from "../../components/BookDetailModal";
import bookService from "../../services/book.service";
import type { Book, BookCategory } from "../../types/book.types";
import { addToCart } from "../../lib/cart";

const Home = () => {
  const location = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [bookCategory, setBookCategory] = useState<BookCategory[]>([]);
  const [newArrivals, setNewArrivals] = useState<Book[]>([]);
  const [bestSellers, setBestSellers] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [booksRes, categoryRes, newArrivalsRes, bestSellersRes] = await Promise.all([
          bookService.getBooks(),
          bookService.getBookCategories(),
          bookService.getNewArrivals(),
          bookService.getBestSellers()
        ]);

        setBooks([...booksRes.data].sort((a, b) => a.id - b.id));
        setBookCategory(categoryRes.data);
        setNewArrivals(newArrivalsRes.data);
        setBestSellers(bestSellersRes.data);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to load homepage data. Please check API server.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  const heroBooks = useMemo(() => books.slice(0, 3), [books]);

  const handleOpenBookDetail = (book: Book) => {
    setSelectedBook(book);
    setIsDetailModalOpen(true);
  };

  const handleAddToCart = (book: Book) => {
    if (!Cookies.get("token")) {
      setFeedbackMessage("Please login first to add items to cart.");
      return;
    }
    addToCart(book);
    setFeedbackMessage(`Added "${book.title}" to cart.`);
  };

  if (isLoading) {
    return (
      <div className="section-wrap py-10">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-wrap py-20 text-center text-muted-foreground">
        <p className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-10">
        {feedbackMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {feedbackMessage}
          </div>
        )}

        <section id="home-hero">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl border border-white/70 bg-white/85 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_48px_rgba(15,23,42,0.10)]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-orange-600 font-bold">Reader's Spotlight</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2 leading-tight">
                  Discover Stories That Match Your Mood
                </h1>
                <p className="mt-3 text-sm md:text-base text-slate-600 max-w-2xl">
                  Explore fresh arrivals, trending picks, and timeless classics with a clean shopping experience.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    to="/browse"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Browse Products
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/favorites"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    View Favorites
                  </Link>
                </div>

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">Books</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{books.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">Categories</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{bookCategory.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 col-span-2 sm:col-span-1">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">Trending</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{bestSellers.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-orange-700 font-bold mb-3">Featured Covers</p>
                <div className="grid grid-cols-3 gap-2">
                  {heroBooks.map((book) => (
                    <div key={`hero-${book.id}`} className="h-36 rounded-xl border border-white/80 bg-white/90 overflow-hidden shadow-sm">
                      <img src={book.book_img} alt={book.title} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="new-arrivals" className="mb-6 scroll-mt-32">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                New Arrivals
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Highlights the newest products added to the store.
              </p>
            </div>
            <Link
              to="/browse"
              className="shrink-0 h-10 px-4 rounded-xl bg-white/95 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              Browse all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:#fb923c_transparent]">
            <div className="flex gap-4 min-w-max pr-2">
              {newArrivals.slice(0, 10).map((book) => (
                <article
                  key={`arrival-${book.id}`}
                  onClick={() => handleOpenBookDetail(book)}
                  className="w-[280px] shrink-0 rounded-2xl border border-white/85 bg-white/95 p-3.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_36px_rgba(15,23,42,0.12)] transition-shadow cursor-pointer"
                >
                  <div className="h-40 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100/80 to-amber-50 flex items-center justify-center">
                    <img src={book.book_img} alt={book.title} className="h-full w-auto object-contain" />
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.08em] font-bold text-orange-700">{book.category_name}</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900 line-clamp-2 min-h-[3.2rem]">{book.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-1 mt-1">by {book.author_name}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Price</span>
                    <span className="text-xl font-black text-orange-600">${Number(book.price).toFixed(2)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="popular" className="mb-6 scroll-mt-32">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Best-sellers / Popular
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Popular picks readers are buying the most right now.
              </p>
            </div>
            <Link
              to="/browse"
              className="shrink-0 h-10 px-4 rounded-xl bg-white/95 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              Browse all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:#fb923c_transparent]">
            <div className="flex gap-4 min-w-max pr-2">
              {bestSellers.slice(0, 10).map((book) => (
                <article
                  key={`popular-${book.id}`}
                  onClick={() => handleOpenBookDetail(book)}
                  className="w-[280px] shrink-0 rounded-2xl border border-white/85 bg-white/95 p-3.5 shadow-[0_14px_28px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_36px_rgba(15,23,42,0.12)] transition-shadow cursor-pointer"
                >
                  <div className="h-40 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100/80 to-amber-50 flex items-center justify-center">
                    <img src={book.book_img} alt={book.title} className="h-full w-auto object-contain" />
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.08em] font-bold text-orange-700">{book.category_name}</p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900 line-clamp-2 min-h-[3.2rem]">{book.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-1 mt-1">by {book.author_name}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Price</span>
                    <span className="text-xl font-black text-orange-600">${Number(book.price).toFixed(2)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="catalogue" className="rounded-3xl border border-white/70 bg-white/85 backdrop-blur-xl p-6 md:p-8 shadow-[0_18px_40px_rgba(15,23,42,0.10)] scroll-mt-32">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-orange-700/90 font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Curated Collection
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">Book Catalogue</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-xl">
            Discover books by category, theme, and popularity with our curated collections.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/90 border border-white/95 p-3.5 shadow-sm">
              <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Books</p>
              <p className="mt-1 text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpenText className="h-5 w-5 text-orange-500" />
                {books.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 border border-white/95 p-3.5 shadow-sm">
              <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Categories</p>
              <p className="mt-1 text-xl font-black text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-orange-500" />
                {bookCategory.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 border border-white/95 p-3.5 shadow-sm">
              <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Best Sellers</p>
              <p className="mt-1 text-xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                {bestSellers.length}
              </p>
            </div>
          </div>
        </section>

        <section id="help" className="rounded-3xl border border-white/70 bg-white/85 backdrop-blur-xl p-6 md:p-8 shadow-[0_18px_40px_rgba(15,23,42,0.10)] scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-orange-600 font-bold">Need Help?</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">Support, Orders, and Account Assistance</h3>
              <p className="text-slate-600 mt-2 text-sm">Our team can help with purchases, order status, and account issues.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="h-10 px-5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center">
                Contact Support
              </Link>
              <Link to="/browse" className="h-10 px-5 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-white inline-flex items-center">
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
    </div>
  );
};

export default Home;
