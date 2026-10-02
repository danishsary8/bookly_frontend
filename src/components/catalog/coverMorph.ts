import { useSyncExternalStore, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { BookCard } from "@/api/types";

/*
 * Shared-element cover morph: card cover → /books/:id cover.
 *
 * Only the clicked cover carries `layoutId="book-cover-<id>"` (a book can be on
 * one page twice, e.g. in two Home shelves, and duplicate layoutIds would morph
 * covers into each other). Clicking marks that instance as the source, waits a
 * frame so it re-renders with the layoutId, then navigates with the card as
 * `state.preview`, which the detail page shows while the full book loads.
 * Reduced motion: the global Motion config makes the morph instant.
 */

let activeSource: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const coverLayoutId = (bookId: number | string) => `book-cover-${bookId}`;

/** layoutId for one cover instance: set only while it is the morph source. */
export const useMorphLayoutId = (bookId: number | undefined, instanceKey: string) =>
  useSyncExternalStore(subscribe, () => (bookId !== undefined && activeSource === instanceKey ? coverLayoutId(bookId) : undefined));

export type BookPreviewState = { preview?: BookCard };

/** onClick for links to /books/:id that should morph from the given cover instance. */
export const useCoverMorphNavigate = () => {
  const navigate = useNavigate();
  return (event: MouseEvent, book: BookCard, instanceKey: string) => {
    // New tab / window: let the browser handle it.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !book.id) return;
    event.preventDefault();
    activeSource = instanceKey;
    listeners.forEach((listener) => listener());
    requestAnimationFrame(() => navigate(`/books/${book.id}`, { state: { preview: book } satisfies BookPreviewState }));
  };
};
