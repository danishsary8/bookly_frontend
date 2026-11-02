import type { StaffBook } from "@/api/endpoints/staff";

/*
 * A cover chosen on the New book page before the book has any format (owner 2026-11-02: cover box on New book). Covers
 * belong to formats in the API, so the picture waits here (this browser tab) until the first format is added.
 */
const key = (bookId: number) => `bookly.pendingCover.${bookId}`;

export const pendingCover = {
  get: (bookId: number): string => {
    try {
      return sessionStorage.getItem(key(bookId)) ?? "";
    } catch {
      return "";
    }
  },
  set: (bookId: number, url: string) => {
    try {
      if (url) sessionStorage.setItem(key(bookId), url);
      else sessionStorage.removeItem(key(bookId));
    } catch {
      /* private mode: the cover is still passed along in the page state */
    }
  },
};

/** The book's main cover: the first format that has one, else a cover waiting for the first format. */
export const mainCover = (book: StaffBook) => book.variants.find((v) => v.cover_image_url)?.cover_image_url ?? pendingCover.get(book.id);
