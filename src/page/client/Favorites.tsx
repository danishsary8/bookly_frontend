import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, LogIn, Search } from "lucide-react";
import BookCard from "../../components/BookCard";
import { BookCardSkeleton } from "../../components/BookCardSkeleton";
import bookService from "../../services/book.service";
import customerService from "../../services/customer.service";
import type { Book } from "../../types/book.types";
import { isAuthenticated, loadFavorites, saveFavorites } from "../../lib/favorites";
import { getStoredUser } from "../../lib/session";
import { alertToast } from "../../lib/alerts";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/EmptyState";
import { controlClassName } from "../../components/form/Field";
import { cn } from "@/lib/utils";

/*
 * Wishlist. Each saved id is fetched with GET /books/{id} (the old page used the first
 * page of GET /books, so favourites beyond page 1 silently disappeared). Removing is
 * immediate with an Undo toast that restores the book to the same position.
 */

const Favorites = () => {
  const navigate = useNavigate();
  const signedIn = isAuthenticated() && getStoredUser()?.role === "customer";
  const [ids, setIds] = useState<number[]>(() => (signedIn ? loadFavorites() : []));
  const [books, setBooks] = useState<Record<number, Book>>({});
  const [isLoading, setIsLoading] = useState(signedIn);
  const [query, setQuery] = useState("");
  const showSkeleton = useSkeletonVisible(isLoading);

  useEffect(() => {
    if (!signedIn) return;
    const initial = loadFavorites();
    if (initial.length === 0) {
      setIsLoading(false);
      return;
    }
    let active = true;
    Promise.allSettled(initial.map((id) => bookService.getBook(id))).then((results) => {
      if (!active) return;
      const found: Record<number, Book> = {};
      results.forEach((result) => { if (result.status === "fulfilled") found[result.value.id] = result.value; });
      setBooks(found);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [signedIn]);

  // Books that no longer exist in the catalogue are skipped, not shown as broken cards.
  const saved = useMemo(() => ids.map((id) => books[id]).filter((book): book is Book => Boolean(book)), [ids, books]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? saved.filter((book) => `${book.title} ${book.author_name}`.toLowerCase().includes(q)) : saved;
  }, [saved, query]);

  const remove = async (book: Book) => {
    const position = ids.indexOf(book.id);
    const next = ids.filter((id) => id !== book.id);
    setIds(next);
    saveFavorites(next);
    const undo = await alertToast.withAction("success", "Removed from wishlist", book.title, "Undo");
    if (!undo) return;
    setIds((current) => {
      if (current.includes(book.id)) return current;
      const restored = [...current];
      restored.splice(Math.min(position, restored.length), 0, book.id);
      saveFavorites(restored);
      return restored;
    });
  };

  const addToCart = async (book: Book) => {
    try {
      await customerService.addCartItem(book.id, 1);
      const viewCart = await alertToast.withAction("success", "Added to cart", book.title, "View cart");
      if (viewCart) navigate("/cart");
    } catch (error: any) {
      alertToast.error("Couldn't add to cart", error?.response?.data?.message || "Try again in a moment.");
    }
  };

  const header = (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow">Saved for later</p>
        <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground">Wishlist</h1>
        {signedIn && !isLoading && saved.length > 0 ? (
          <p className="mt-2 text-muted-foreground"><span className="tabular-nums">{saved.length}</span> {saved.length === 1 ? "book" : "books"} saved</p>
        ) : null}
      </div>
      {signedIn && saved.length > 3 ? (
        <div className="relative md:w-80">
          <label htmlFor="wishlist-search" className="sr-only">Search your wishlist</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input id="wishlist-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or author" className={cn(controlClassName, "h-11 pl-10")} />
        </div>
      ) : null}
    </header>
  );

  if (!signedIn) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        <EmptyState
          icon={LogIn}
          title="Sign in to see your wishlist"
          description="Save books with the heart on any cover and they'll wait here for you."
          action={<Button asChild><Link to="/login" state={{ from: "/favorites" }}>Sign in</Link></Button>}
          secondaryAction={<Button asChild variant="link"><Link to="/register">Create an account</Link></Button>}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {header}
        {showSkeleton ? (
          <div aria-busy="true" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <span className="sr-only">Loading your wishlist…</span>
            {Array.from({ length: Math.min(Math.max(ids.length, 2), 8) }, (_, i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="section-wrap py-8 lg:py-12">
      {header}
      {saved.length === 0 ? (
        <EmptyState icon={Heart} title="Nothing saved yet" description="Tap the heart on any book to keep it here for later." action={<Button asChild><Link to="/browse">Discover books</Link></Button>} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} headingLevel="h2" title={`Nothing matches "${query.trim()}"`} description="Try a shorter title or the author's surname." action={<Button variant="outline" onClick={() => setQuery("")}>Clear search</Button>} />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">{visible.length} saved {visible.length === 1 ? "book" : "books"} shown</p>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((book) => (
              <li key={book.id}>
                <BookCard {...book} isFavorite onToggleFavorite={() => void remove(book)} onAddToCart={() => void addToCart(book)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Favorites;
