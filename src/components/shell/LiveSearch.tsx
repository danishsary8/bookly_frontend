import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { CoverThumb } from "@/components/CoverThumb";
import { SkeletonRow } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { highlightParts } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import { searchPath } from "./nav";
import { formatMoney, useCurrency } from "@/stores/currency";

/*
 * MASTER §6.20 header live search, an ARIA 1.2 combobox:
 * - 250ms debounce, at least 2 characters, up to 6 books + "See all results".
 * - ↑/↓ move through the options (aria-activedescendant keeps focus in the field),
 *   Enter opens the active option or, with none, the full results page.
 * - Esc clears the field, a second Esc closes; "/" anywhere focuses the header field.
 */

const MIN_QUERY = 2;
const LIMIT = 6;

type LiveSearchProps = {
  id: string;
  /** The header field listens for the "/" shortcut; the mobile-menu one doesn't. */
  shortcut?: boolean;
  /** Called after navigating, e.g. to close the mobile menu. */
  onNavigate?: () => void;
  className?: string;
  inputClassName?: string;
};

export function LiveSearch({ id, shortcut = false, onNavigate, className, inputClassName }: LiveSearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currency = useCurrency();
  const listboxId = `${id}-results`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const hintId = useId();

  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebouncedValue(query.trim(), 250);
  const enabled = term.length >= MIN_QUERY;
  const results = useQuery({
    ...catalogQueries.books({ q: term, sort: "relevance", per_page: LIMIT }),
    enabled,
    placeholderData: undefined,
    staleTime: 60_000,
  });
  const books: BookCard[] = enabled ? (results.data?.data ?? []) : [];
  const total = results.data?.meta?.total ?? books.length;
  const waiting = query.trim().length >= MIN_QUERY && (query.trim() !== term || results.isFetching) && books.length === 0;
  const showSkeleton = useSkeletonVisible(waiting);
  const expanded = open && query.trim().length >= MIN_QUERY;
  const optionCount = books.length + 1; // + "See all results"

  // Close when the route changes (a result was opened) and on a click outside.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  const go = (to: string) => {
    setOpen(false);
    setActive(-1);
    navigate(to);
    onNavigate?.();
  };

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    if (active >= 0 && active < books.length && books[active].id) return go(`/books/${books[active].id}`);
    go(searchPath(q));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        if (!expanded) return setOpen(true);
        event.preventDefault();
        setActive((i) => (i + 1) % optionCount);
        break;
      case "ArrowUp":
        if (!expanded) return;
        event.preventDefault();
        setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
        break;
      case "Enter":
        event.preventDefault();
        submit();
        break;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query) {
          event.preventDefault();
          setQuery("");
        }
        break;
    }
  };

  return (
    <div ref={rootRef} role="search" className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Search books
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        aria-describedby={shortcut ? hintId : undefined}
        placeholder="Search titles, authors, series"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "h-11 w-full rounded-md border border-input bg-card pl-10 pr-11 text-base text-foreground placeholder:text-muted-foreground/80",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          inputClassName,
        )}
      />
      {shortcut ? (
        <>
          <span id={hintId} className="sr-only">
            Press slash to search from anywhere.
          </span>
          {query ? null : (
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 font-sans text-xs text-muted-foreground lg:block"
            >
              /
            </kbd>
          )}
        </>
      ) : null}
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      {expanded ? (
        <div className="ui-pop absolute inset-x-0 top-[calc(100%+6px)] z-(--z-popover) min-w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-overlay" data-state="open">
          <ul id={listboxId} role="listbox" aria-label="Search suggestions" className="max-h-[min(28rem,70dvh)] overflow-y-auto p-1.5">
            {showSkeleton ? (
              <li role="presentation" className="grid gap-3 p-2">
                <span className="sr-only">Searching…</span>
                <SkeletonRow className="[&>div:first-child]:h-12 [&>div:first-child]:w-8" />
                <SkeletonRow className="[&>div:first-child]:h-12 [&>div:first-child]:w-8" />
                <SkeletonRow className="[&>div:first-child]:h-12 [&>div:first-child]:w-8" />
              </li>
            ) : null}

            {!waiting && results.isError ? (
              <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
                Search isn't responding.{" "}
                <button type="button" onClick={() => results.refetch()} className="font-semibold text-primary underline-offset-4 hover:underline">
                  Try again
                </button>
              </li>
            ) : null}

            {!waiting && !results.isError && enabled && results.isSuccess && books.length === 0 ? (
              <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
                No books match "{term}". Try a shorter title or an author's surname.
              </li>
            ) : null}

            {books.map((book, index) => (
              <li
                key={book.id}
                id={optionId(index)}
                role="option"
                aria-selected={active === index}
                onPointerMove={() => setActive(index)}
                onClick={() => book.id && go(`/books/${book.id}`)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2", active === index && "bg-secondary")}
              >
                <CoverThumb src={book.cover_image_url} className="h-12 w-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-foreground">
                    {highlightParts(book.title ?? "", term).map((part, i) =>
                      part.match ? <mark key={i} className="bg-transparent font-semibold text-foreground">{part.text}</mark> : <span key={i}>{part.text}</span>,
                    )}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {(book.authors ?? []).map((a) => a.name).join(", ") || "Unknown author"}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatMoney(book.price_from_usd, book.price_from_khr, currency)}
                </span>
              </li>
            ))}

            {!waiting ? (
              <li
                id={optionId(books.length)}
                role="option"
                aria-selected={active === books.length}
                onPointerMove={() => setActive(books.length)}
                onClick={() => go(searchPath(query))}
                className={cn(
                  "mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-lg border-t border-border px-3 py-3 text-sm font-semibold text-primary",
                  active === books.length && "bg-secondary",
                )}
              >
                <span className="truncate">
                  See all {total > LIMIT ? `${total} ` : ""}results for "{query.trim()}"
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {expanded && !waiting && enabled && results.isSuccess ? `${books.length} suggestions` : ""}
      </p>
    </div>
  );
}
