import { Barcode, SpellCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import { isbnDigits, suggestSpelling } from "@/lib/catalog";
import { useT } from "@/i18n";

/*
 * Lines above search results (pages/catalogue-v2.md §3):
 * - similar spellings: the API found nothing exact and matched loosely; offer "Did you mean …?" built from the
 *   titles and authors it returned (the API sends no suggestion of its own);
 * - ISBN: the query is an ISBN, so say we looked for that exact edition.
 */
export function SearchNotices({ q, typoTolerant, books }: { q: string; typoTolerant: boolean; books: BookCard[] }) {
  const { dict } = useT();
  const c = dict.catalogue;
  const isbn = isbnDigits(q);
  const suggestion = typoTolerant ? suggestSpelling(q, books.flatMap((b) => [b.title ?? "", ...(b.authors ?? []).map((a) => a.name ?? "")])) : null;

  if (isbn) {
    return (
      <p className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-[15px]">
        <Barcode className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
        <span>{c.isbnSearch(isbn)}</span>
      </p>
    );
  }
  if (!typoTolerant) return null;
  return (
    <p className="flex flex-wrap items-start gap-x-2.5 gap-y-1 rounded-xl border border-border bg-card px-4 py-3 text-[15px]">
      <SpellCheck className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {dict.browse.similarSpelling(q)}
        {suggestion ? (
          <>
            {" "}
            {c.didYouMean}{" "}
            <Link to={`/search?q=${encodeURIComponent(suggestion)}`} className="font-semibold text-primary underline underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
              {suggestion}
            </Link>
            ?
          </>
        ) : null}
      </span>
    </p>
  );
}
