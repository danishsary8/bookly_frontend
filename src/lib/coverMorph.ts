import { useSyncExternalStore, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Book } from "../types/book.types";

/*
 * Shared-element cover morph: card cover → /books/:id cover.
 *
 * Only the cover that was actually clicked carries `layoutId="book-cover-<id>"`.
 * (The same book can appear several times on one page, e.g. in two Home shelves, and
 * duplicate layoutIds would make motion animate covers between each other.) Clicking
 * marks that instance as the source, waits one frame so it re-renders with the
 * layoutId, then navigates. BookDetail always gives its cover the same layoutId.
 * Reduced motion: MotionGlobalConfig.skipAnimations makes the morph instant.
 */

let activeSource: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const coverLayoutId = (bookId: number | string) => `book-cover-${bookId}`;

/** layoutId for one cover instance: set only while it is the morph source. */
export const useMorphLayoutId = (bookId: number | string, instanceKey: string) =>
  useSyncExternalStore(subscribe, () => (activeSource === instanceKey ? coverLayoutId(bookId) : undefined));

export interface BookPreview {
  id: number;
  title: string;
  book_img: string;
  author_name?: string;
  category_name?: string;
}

/** onClick for links to /books/:id that should morph from the given cover instance. */
export const useCoverMorphNavigate = () => {
  const navigate = useNavigate();
  // fixedSource: the cover sits in a position:fixed layer (the quick-view modal). motion measures
  // in page coordinates, so scroll the page underneath to the top first; otherwise the morph
  // would start `scrollY` pixels away from where the cover actually is on screen.
  return (event: MouseEvent, book: Pick<Book, "id" | "title" | "book_img" | "author_name" | "category_name">, instanceKey: string, after?: () => void, fixedSource = false) => {
    // Let the browser handle new-tab / new-window clicks normally.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (fixedSource && window.scrollY) window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    activeSource = instanceKey;
    listeners.forEach((listener) => listener());
    const preview: BookPreview = { id: book.id, title: book.title, book_img: book.book_img, author_name: book.author_name, category_name: book.category_name };
    requestAnimationFrame(() => {
      after?.();
      navigate(`/books/${book.id}`, { state: { preview } });
    });
  };
};
