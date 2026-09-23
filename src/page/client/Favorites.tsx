import { useEffect, useMemo, useState } from "react";
import { Heart, Search, Sparkles, X } from "lucide-react";
import BookCard from "../../components/BookCard";
import Loading from "../../components/ui/loading";
import Modal from "../../components/ui/modal";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";
import bookService from "../../services/book.service";
import customerService from "../../services/customer.service";
import type { Book } from "../../types/book.types";
import { isAuthenticated, loadFavorites, saveFavorites, toggleFavoriteId } from "../../lib/favorites";
import { getStoredUser } from "../../lib/session";
import { alertToast } from "../../lib/alerts";

const Favorites = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTitle, setSearchTitle] = useState("");

  const [favoriteBookIds, setFavoriteBookIds] = useState<number[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

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

    void fetchBooks();
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
    if (message) {
      alertToast.info("Authentication required", message);
    }
    setIsAuthModalOpen(true);
  };

  const handleToggleFavorite = (bookId: number) => {
    if (!isAuthenticated()) {
      requireAuth("login", "Please login to view and manage favorites.");
      return;
    }
    setFavoriteBookIds((prev) => toggleFavoriteId(prev, bookId));
  };

  const handleAddToCart = async (book: Book) => {
    if (!isAuthenticated() || getStoredUser()?.role !== "customer") {
      requireAuth("login", "You need to login as a customer before adding items to cart.");
      return;
    }

    try {
      await customerService.addCartItem(book.id, 1);
      alertToast.success("Added to cart", book.title);
    } catch (error: any) {
      alertToast.error("Unable to add to cart", error?.response?.data?.message || "Please try again.");
    }
  };

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-6">
        <section className="rounded-2xl border border-border/50 bg-card shadow-sm p-6 md:p-8">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-accent font-bold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Your Collection
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Favorite Products</h1>
          <p className="text-sm text-foreground/70 mt-3 max-w-2xl">
            Keep your saved books in one place and come back to them anytime.
          </p>

          <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Search favorites by title..."
                className="h-10 w-full rounded-lg border border-border/50 bg-background px-3 pl-9 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
              />
            </div>
            {favoriteBookIds.length > 0 && (
              <button
                onClick={() => setFavoriteBookIds([])}
                className="h-10 px-4 rounded-lg border border-border/50 bg-background text-sm font-medium text-foreground hover:bg-background/80 transition-all duration-200"
              >
                Clear all favorites
              </button>
            )}
          </div>
        </section>

        {!isAuthenticated() ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-background/50 p-8 text-center">
            <p className="text-base font-medium text-foreground/80">Login to see your favorite products.</p>
            <button
              onClick={() => requireAuth("login")}
              className="mt-4 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200"
            >
              Login to Continue
            </button>
          </div>
        ) : isLoading ? (
          <Loading />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/60">
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
          <div className="rounded-2xl border border-dashed border-border/50 bg-background/50 p-8 text-foreground/60 text-center">
            <div className="flex items-center justify-center gap-2 text-foreground/80 font-medium mb-2">
              <Heart className="h-5 w-5 text-accent/70" />
              No favorites yet
            </div>
            <p>Start adding books to favorites from the Browse page.</p>
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
                alertToast.success("Login successful", "Your favorites are ready.");
                setIsAuthModalOpen(false);
                setFavoriteBookIds(loadFavorites());
              }}
            />
          ) : (
            <CustomerRegisterForm
              onRegisterSuccess={() => {
                alertToast.success("Account created", "You can now save favorite books.");
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
