import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Layers, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import BookCard from "../../components/BookCard";
import Loading from "../../components/ui/loading";
import Modal from "../../components/ui/modal";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../../components/ui/combobox";
import bookService from "../../services/book.service";
import customerService from "../../services/customer.service";
import type { Book, BookAuthor, BookCatalogMeta, BookCategory, BookQueryParams } from "../../types/book.types";
import { isAuthenticated, loadFavorites, saveFavorites, toggleFavoriteId } from "../../lib/favorites";
import { getStoredUser } from "../../lib/session";
import { alertToast } from "../../lib/alerts";

const PAGE_SIZE = 12;

const defaultMeta: BookCatalogMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  total_pages: 0,
  has_next_page: false,
  has_previous_page: false,
  sort: "newest",
  price_range: {
    min: 0,
    max: 0,
  },
};

const Browse = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookCategories, setBookCategories] = useState<BookCategory[]>([]);
  const [authors, setAuthors] = useState<BookAuthor[]>([]);
  const [catalogMeta, setCatalogMeta] = useState<BookCatalogMeta>(defaultMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isLookupLoading, setIsLookupLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<BookQueryParams["sort"]>("newest");
  const [page, setPage] = useState(1);

  const [favoriteBookIds, setFavoriteBookIds] = useState<number[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  const deferredSearchTitle = useDeferredValue(searchTitle.trim());

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        setIsLookupLoading(true);
        const [categoryRes, authorRes] = await Promise.all([
          bookService.getBookCategories(),
          bookService.getAuthors(),
        ]);
        setBookCategories(categoryRes.data);
        setAuthors(authorRes.data);
      } catch (lookupError) {
        console.error(lookupError);
      } finally {
        setIsLookupLoading(false);
      }
    };

    void fetchLookupData();
  }, []);

  const selectedCategoryId = useMemo(
    () => bookCategories.find((category) => category.name === selectedCategory)?.id,
    [bookCategories, selectedCategory],
  );

  const selectedAuthorId = useMemo(
    () => authors.find((author) => author.name === selectedAuthor)?.id,
    [authors, selectedAuthor],
  );

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await bookService.getBooks({
          search: deferredSearchTitle || undefined,
          category_id: selectedCategoryId,
          author_id: selectedAuthorId,
          min_price: minPrice !== "" ? Number(minPrice) : undefined,
          max_price: maxPrice !== "" ? Number(maxPrice) : undefined,
          sort: sortBy,
          page,
          limit: PAGE_SIZE,
        });

        setBooks(response.data);
        setCatalogMeta(response.meta ?? defaultMeta);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to load books. Please check API connection.");
        setBooks([]);
        setCatalogMeta(defaultMeta);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBooks();
  }, [deferredSearchTitle, selectedCategoryId, selectedAuthorId, minPrice, maxPrice, sortBy, page]);

  useEffect(() => {
    setFavoriteBookIds(loadFavorites());

    const syncFavorites = () => setFavoriteBookIds(loadFavorites());
    window.addEventListener("auth-changed", syncFavorites);
    return () => window.removeEventListener("auth-changed", syncFavorites);
  }, []);

  useEffect(() => {
    saveFavorites(favoriteBookIds);
  }, [favoriteBookIds]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (selectedCategory) {
      filters.push({
        key: "category",
        label: `Category: ${selectedCategory}`,
        onClear: () => {
          setSelectedCategory("");
          resetToFirstPage();
        },
      });
    }

    if (selectedAuthor) {
      filters.push({
        key: "author",
        label: `Author: ${selectedAuthor}`,
        onClear: () => {
          setSelectedAuthor("");
          resetToFirstPage();
        },
      });
    }

    if (minPrice) {
      filters.push({
        key: "min-price",
        label: `Min: $${Number(minPrice).toFixed(2)}`,
        onClear: () => {
          setMinPrice("");
          resetToFirstPage();
        },
      });
    }

    if (maxPrice) {
      filters.push({
        key: "max-price",
        label: `Max: $${Number(maxPrice).toFixed(2)}`,
        onClear: () => {
          setMaxPrice("");
          resetToFirstPage();
        },
      });
    }

    if (deferredSearchTitle) {
      filters.push({
        key: "search",
        label: `Search: ${deferredSearchTitle}`,
        onClear: () => {
          setSearchTitle("");
          resetToFirstPage();
        },
      });
    }

    return filters;
  }, [selectedCategory, selectedAuthor, minPrice, maxPrice, deferredSearchTitle]);

  const requireAuth = (mode: "login" | "register" = "login", message?: string) => {
    setAuthModalMode(mode);
    if (message) {
      alertToast.info("Authentication required", message);
    }
    setIsAuthModalOpen(true);
  };

  const handleToggleFavorite = (bookId: number) => {
    if (!isAuthenticated()) {
      requireAuth("login", "Login is required to save favorite products.");
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
    } catch (cartError: any) {
      alertToast.error("Unable to add to cart", cartError?.response?.data?.message || "Please try again.");
    }
  };

  const resetToFirstPage = () => {
    startTransition(() => {
      setPage(1);
    });
  };

  const clearAllFilters = () => {
    setSelectedCategory("");
    setSelectedAuthor("");
    setSearchTitle("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    resetToFirstPage();
  };

  const handlePageChange = (nextPage: number) => {
    startTransition(() => {
      setPage(nextPage);
    });
  };

  return (
    <div className="w-full">
      <main className="section-wrap py-6 lg:py-10 space-y-6">
        <section id="browse" className="scroll-mt-32">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm p-6 md:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col gap-6">
              <div>
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-primary font-bold mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Search Products
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">Browse All Books</h2>
                <p className="text-sm text-foreground/70 mt-3 max-w-2xl">
                  Fast server-side search, cleaner filters, and paginated discovery for a smoother catalogue experience.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-background/60 border border-border/40 p-4">
                  <p className="text-xs uppercase text-foreground/60 font-semibold tracking-[0.1em]">Matching Books</p>
                  <p className="mt-2 text-2xl font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {catalogMeta.total}
                  </p>
                </div>
                <div className="rounded-lg bg-background/60 border border-border/40 p-4">
                  <p className="text-xs uppercase text-foreground/60 font-semibold tracking-[0.1em]">Categories</p>
                  <p className="mt-2 text-2xl font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    {bookCategories.length}
                  </p>
                </div>
                <div className="rounded-lg bg-background/60 border border-border/40 p-4">
                  <p className="text-xs uppercase text-foreground/60 font-semibold tracking-[0.1em]">Page</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{catalogMeta.page}{catalogMeta.total_pages ? ` / ${catalogMeta.total_pages}` : ""}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]">
                <div className="relative w-full">
                  <Search className="h-4 w-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTitle}
                    onChange={(event) => {
                      setSearchTitle(event.target.value);
                      resetToFirstPage();
                    }}
                    placeholder="Search by title, author, or category..."
                    className="h-10 w-full rounded-lg border border-border/50 bg-background px-3 pl-9 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  />
                </div>

                <Combobox
                  items={bookCategories}
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(String(value ?? ""));
                    resetToFirstPage();
                  }}
                >
                  <ComboboxInput className="w-full bg-background border-border/50" placeholder={isLookupLoading ? "Loading categories..." : "Filter by category"} />
                  <ComboboxContent>
                    <ComboboxEmpty>No categories found.</ComboboxEmpty>
                    <ComboboxList>
                      {bookCategories.map((item) => (
                        <ComboboxItem key={item.id} value={item.name}>
                          {item.name}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>

                <Combobox
                  items={authors}
                  value={selectedAuthor}
                  onValueChange={(value) => {
                    setSelectedAuthor(String(value ?? ""));
                    resetToFirstPage();
                  }}
                >
                  <ComboboxInput className="w-full bg-background border-border/50" placeholder={isLookupLoading ? "Loading authors..." : "Filter by author"} />
                  <ComboboxContent>
                    <ComboboxEmpty>No authors found.</ComboboxEmpty>
                    <ComboboxList>
                      {authors.map((item) => (
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
                  onChange={(event) => {
                    setMinPrice(event.target.value);
                    resetToFirstPage();
                  }}
                  placeholder={`Min $${catalogMeta.price_range.min.toFixed(2)}`}
                  className="h-10 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(event) => {
                    setMaxPrice(event.target.value);
                    resetToFirstPage();
                  }}
                  placeholder={`Max $${catalogMeta.price_range.max.toFixed(2)}`}
                  className="h-10 w-full rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                />
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs font-semibold text-foreground/70">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    {activeFilters.length} active filters
                  </div>
                  {activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={filter.onClear}
                      className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-background/80"
                    >
                      {filter.label}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value as BookQueryParams["sort"]);
                      resetToFirstPage();
                    }}
                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
                  >
                    <option value="newest">Newest first</option>
                    <option value="popular">Most popular</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                    <option value="title_asc">Title: A to Z</option>
                    <option value="title_desc">Title: Z to A</option>
                  </select>

                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="h-10 px-4 rounded-lg border border-border/50 bg-background text-sm font-medium text-foreground hover:bg-background/80 transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <Loading message="Loading catalogue" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">{error}</p>
          </div>
        ) : books.length > 0 ? (
          <>
            <section id="books-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 scroll-mt-32">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  {...book}
                  isFavorite={favoriteBookIds.includes(book.id)}
                  onToggleFavorite={() => handleToggleFavorite(book.id)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-foreground/70">
                Showing {(catalogMeta.page - 1) * catalogMeta.limit + 1} to {Math.min(catalogMeta.page * catalogMeta.limit, catalogMeta.total)} of {catalogMeta.total} books
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!catalogMeta.has_previous_page}
                  onClick={() => handlePageChange(catalogMeta.page - 1)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/50 bg-background px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="rounded-lg border border-border/40 bg-background/60 px-4 py-2 text-sm font-semibold text-foreground">
                  Page {catalogMeta.page} of {Math.max(catalogMeta.total_pages, 1)}
                </div>

                <button
                  type="button"
                  disabled={!catalogMeta.has_next_page}
                  onClick={() => handlePageChange(catalogMeta.page + 1)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border/50 bg-background px-4 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No books found</p>
            <p className="text-sm mt-1">Try a different search, filter, or sort option.</p>
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
                alertToast.success("Login successful", "Welcome back.");
                setIsAuthModalOpen(false);
                setFavoriteBookIds(loadFavorites());
              }}
            />
          ) : (
            <CustomerRegisterForm
              onRegisterSuccess={() => {
                alertToast.success("Account created", "Your customer account is ready.");
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
