import { useEffect, useMemo, useState } from "react";
import { BookOpen, Layers, Search, Sparkles, X } from "lucide-react";
import Cookies from "js-cookie";

import BookCard from "../../components/BookCard";
import Loading from "../../components/ui/loading";
import Modal from "../../components/ui/modal";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../../components/ui/combobox";
import bookService from "../../services/book.service";
import type { Book, BookCategory } from "../../types/book.types";
import { isAuthenticated, loadFavorites, saveFavorites, toggleFavoriteId } from "../../lib/favorites";
import { addToCart } from "../../lib/cart";

const Browse = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookCategory, setBookCategory] = useState<BookCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [favoriteBookIds, setFavoriteBookIds] = useState<number[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [booksRes, categoryRes] = await Promise.all([
          bookService.getBooks(),
          bookService.getBookCategories()
        ]);
        setBooks([...booksRes.data].sort((a, b) => a.id - b.id));
        setBookCategory(categoryRes.data);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to load books. Please check API connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  const authorOptions = useMemo(
    () =>
      Array.from(new Set(books.map((book) => book.author_name)))
        .sort((a, b) => a.localeCompare(b))
        .map((name, index) => ({ id: index + 1, name })),
    [books]
  );

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesCategory = !selectedCategory || book.category_name === selectedCategory;
      const matchesAuthor = !selectedAuthor || book.author_name === selectedAuthor;
      const matchesTitle = !searchTitle || book.title.toLowerCase().includes(searchTitle.toLowerCase());

      const parsedMin = minPrice ? Number(minPrice) : null;
      const parsedMax = maxPrice ? Number(maxPrice) : null;
      const numericPrice = Number(book.price);
      const matchesMin = parsedMin === null || (!Number.isNaN(parsedMin) && numericPrice >= parsedMin);
      const matchesMax = parsedMax === null || (!Number.isNaN(parsedMax) && numericPrice <= parsedMax);

      return matchesCategory && matchesAuthor && matchesTitle && matchesMin && matchesMax;
    });
  }, [books, selectedCategory, selectedAuthor, searchTitle, minPrice, maxPrice]);

  const requireAuth = (mode: "login" | "register" = "login", message?: string) => {
    setAuthModalMode(mode);
    if (message) setFeedbackMessage(message);
    setIsAuthModalOpen(true);
  };

  const handleToggleFavorite = (bookId: number) => {
    if (!isAuthenticated()) {
      requireAuth("login", "Login is required to save favorite products.");
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
        <section id="browse" className="scroll-mt-32">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-gradient-to-br from-white/95 via-amber-50/60 to-orange-100/50 p-6 md:p-9 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-orange-300/30 blur-3xl" />

            <div className="relative flex flex-col gap-6">
              <div>
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-orange-700/90 font-bold mb-3">
                  <Sparkles className="h-3.5 w-3.5" />
                  Search Products
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900">Browse All Books</h2>
                <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                  Find books faster with title search, filters, and clean product discovery flow.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/90 border border-white/95 p-3.5 shadow-sm">
                  <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Books</p>
                  <p className="mt-1 text-xl font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-orange-500" />
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
                  <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">Showing</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{filteredBooks.length}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                <div className="relative w-full md:flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    placeholder="Search by book title..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white/95 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300/40"
                  />
                </div>

                <Combobox
                  items={bookCategory}
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(String(value ?? ""))}
                >
                  <ComboboxInput className="w-full md:w-56 bg-white/95" placeholder="Filter by category" />
                  <ComboboxContent>
                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.id} value={item.name}>
                          {item.name}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>

                <Combobox
                  items={authorOptions}
                  value={selectedAuthor}
                  onValueChange={(value) => setSelectedAuthor(String(value ?? ""))}
                >
                  <ComboboxInput className="w-full md:w-56 bg-white/95" placeholder="Filter by author" />
                  <ComboboxContent>
                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                    <ComboboxList>
                      {authorOptions.map((item) => (
                        <ComboboxItem key={item.id} value={item.name}>
                          {item.name}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min price"
                  className="h-10 w-full md:w-32 rounded-xl border border-slate-200 bg-white/95 px-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300/40"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max price"
                  className="h-10 w-full md:w-32 rounded-xl border border-slate-200 bg-white/95 px-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-300/40 focus:border-orange-300/40"
                />
              </div>
            </div>
          </div>
        </section>

        {feedbackMessage && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {feedbackMessage}
          </div>
        )}

        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">{error}</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          <section id="books-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 scroll-mt-32">
            {filteredBooks.map((book) => (
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
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No books found</p>
            <p className="text-sm mt-1">Try a different search or filter</p>
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

export default Browse;
