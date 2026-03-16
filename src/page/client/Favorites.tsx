import { useEffect, useMemo, useState } from "react";
import { Heart, Search, Sparkles, X } from "lucide-react";
import Cookies from "js-cookie";

import BookCard from "../../components/BookCard";
import Loading from "../../components/ui/loading";
import Modal from "../../components/ui/modal";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";
import bookService from "../../services/book.service";
import type { Book } from "../../types/book.types";
import { isAuthenticated, loadFavorites, saveFavorites, toggleFavoriteId } from "../../lib/favorites";
import { addToCart } from "../../lib/cart";

const Favorites = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTitle, setSearchTitle] = useState("");

  const [favoriteBookIds, setFavoriteBookIds] = useState<number[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        const booksRes = await bookService.getBooks();
        setBooks([...booksRes.data].sort((a, b) => a.id - b.id));
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to load books.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    setFavoriteBookIds(loadFavorites());
    const syncFavorites = () => setFavoriteBookIds(loadFavorites());
    window.addEventListener("auth-changed", syncFavorites);
    return () => window.removeEventListener("auth-changed", syncFavorites);
  }, []);

  useEffect(() => {
    saveFavorites(favoriteBookIds);
  }, [favoriteBookIds]);

  const favoriteBooks = useMemo(() => {
    const idsSet = new Set(favoriteBookIds);
    return books
      .filter((book) => idsSet.has(book.id))
      .filter((book) => !searchTitle || book.title.toLowerCase().includes(searchTitle.toLowerCase()));
  }, [books, favoriteBookIds, searchTitle]);

  const requireAuth = (mode: "login" | "register" = "login", message?: string) => {
    setAuthModalMode(mode);
    if (message) setFeedbackMessage(message);
    setIsAuthModalOpen(true);
  };

  const handleToggleFavorite = (bookId: number) => {
    if (!isAuthenticated()) {
      requireAuth("login", "Please login to view and manage favorites.");
      return;
    }
    setFavoriteBookIds((prev) => toggleFavoriteId(prev, bookId));
  };

  const handleAddToCart = (book: Book) => {
    if (!Cookies.get("token")) {
      requireAuth("login", "You need to login first before adding items to cart.");
      return;
    }
    addToCart(book);
    setFeedbackMessage(`Added "${book.title}" to cart.`);
  };

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-6">
        <section className="rounded-[2.25rem] border border-white/70 bg-gradient-to-br from-white/95 via-rose-50/40 to-orange-100/40 p-6 md:p-9 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-rose-600 font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Your Collection
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">Favorite Products</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            Keep your saved books in one place and come back to them anytime.
          </p>

          <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Search favorites by title..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/95 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-300/40 focus:border-rose-300/40"
              />
            </div>
            {favoriteBookIds.length > 0 && (
              <button
                onClick={() => setFavoriteBookIds([])}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Clear all favorites
              </button>
            )}
          </div>
        </section>

        {feedbackMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {feedbackMessage}
          </div>
        )}

        {!isAuthenticated() ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
            <p className="text-base font-semibold text-slate-800">Login to see your favorite products.</p>
            <button
              onClick={() => requireAuth("login")}
              className="mt-3 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Login to Continue
            </button>
          </div>
        ) : isLoading ? (
          <Loading />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">{error}</p>
          </div>
        ) : favoriteBooks.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {favoriteBooks.map((book) => (
              <BookCard
                key={book.id}
                {...book}
                isFavorite={favoriteBookIds.includes(book.id)}
                onToggleFavorite={() => handleToggleFavorite(book.id)}
                onAddToCart={handleAddToCart}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-slate-600">
            <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
              <Heart className="h-4 w-4 text-rose-500" />
              No favorites yet
            </div>
            Start adding books to favorites from the Browse page.
          </div>
        )}
      </main>

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        maxWidthClass="max-w-md"
        showHeader={false}
        bodyClassName="p-6 sm:p-8 bg-white"
      >
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="h-8 w-8 rounded-lg grid place-items-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Close login form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{authModalMode === "login" ? "Login" : "Sign Up"}</h3>
            <p className="text-sm text-slate-500">
              {authModalMode === "login"
                ? "Welcome back! Sign in to continue."
                : "Create your account to get started."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setAuthModalMode("login")}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                authModalMode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setAuthModalMode("register")}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                authModalMode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>

          {authModalMode === "login" ? (
            <CustomerLoginForm
              onLoginSuccess={() => {
                setFeedbackMessage("Login successful.");
                setIsAuthModalOpen(false);
                setFavoriteBookIds(loadFavorites());
              }}
            />
          ) : (
            <CustomerRegisterForm
              onRegisterSuccess={() => {
                setFeedbackMessage("Register successful.");
                setIsAuthModalOpen(false);
                setFavoriteBookIds(loadFavorites());
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Favorites;
