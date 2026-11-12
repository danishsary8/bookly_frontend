import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { Breadcrumb } from "@/components/Breadcrumb";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { CtaGlare } from "@/components/CtaGlare";
import { buttonVariants } from "@/components/ui/button";
import { Bookplate } from "@/features/content/Bookplate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

const elsewhere = [
  { to: "/books", label: "allBooks" },
  { to: "/books?sort=newest", label: "newArrivals" },
  { to: "/authors", label: "authors" },
  { to: "/faq", label: "faq" },
  { to: "/contact", label: "contactUs" },
] as const;

/*
 * Unknown address inside the shop (pages/content.md, pages/catalogue-v2.md §4): the bookplate says the page is
 * "out of print", with a search straight to /search, a few ways back in, the top-level categories and the shop's
 * popular books, so a broken link still ends one tap from a book.
 */
export default function NotFoundPage() {
  const { dict } = useT();
  const c = dict.content;
  useDocumentTitle(c.notFoundDoc, { noindex: true });
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const tree = useQuery(catalogQueries.categoryTree());
  const categories = (tree.data ?? []).filter((cat) => (cat.total_books ?? 0) > 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/books");
  };

  return (
    <div className="container-shell pb-20 pt-6 sm:pt-8">
      <Breadcrumb items={[{ label: c.home, to: "/" }, { label: c.notFoundDoc }]} />
      <Bookplate
        className="mt-4"
        eyebrow={c.error404}
        title={c.outOfPrint}
        lead={c.outOfPrintLead}
      >
        <form onSubmit={submit} role="search" className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <label htmlFor="notfound-search" className="sr-only">
            {c.findBook}
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="notfound-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={c.findPlaceholder}
              autoComplete="off"
              className="h-12 w-full rounded-[4px] border border-transparent bg-card pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>
          <CtaGlare>
            <button type="submit" className={cn(buttonVariants({ variant: "cta", size: "lg" }), "h-12 w-full sm:w-auto")}>
              {c.findIt} <ArrowRight aria-hidden="true" />
            </button>
          </CtaGlare>
        </form>
      </Bookplate>

      <nav aria-label={c.elsewhere} className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
        <span className="mr-2 text-sm font-semibold text-muted-foreground">{c.orTry}</span>
        {elsewhere.map((link) => (
          <Link key={link.to} to={link.to} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {link.label === "allBooks" ? dict.catalogue.allBooks : c[link.label]}
          </Link>
        ))}
      </nav>

      {categories.length > 0 ? (
        <nav aria-label={dict.search.exploreCategories} className="mx-auto mt-6 max-w-4xl">
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/categories/${cat.slug}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium outline-none transition-colors hover:border-primary/40 hover:bg-lapis-tint hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {cat.name}
                  <span className="text-xs tabular-nums text-muted-foreground">{cat.total_books}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <RelatedShelf id="not-found-popular" title={dict.catalogue.popularNow} source={{ kind: "similar" }} seeAllHref="/books?sort=best_selling" className="mt-14" />
    </div>
  );
}
