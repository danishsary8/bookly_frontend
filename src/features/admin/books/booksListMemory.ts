/** The Books list remembers its search, filters and page for this tab, so "← All books" goes back to the same list. */
export const BOOKS_LIST_KEY = "bookly.admin.booksList";

/** "?category=3&page=2", or "" when the list had no filters (or storage is off). */
export function booksListSearch(): string {
  try {
    const search = sessionStorage.getItem(BOOKS_LIST_KEY);
    return search ? `?${search}` : "";
  } catch {
    return "";
  }
}
