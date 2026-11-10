import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { Category } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Home "Shop by category" (pages/home.md): the six biggest top-level categories as wide tiles. Left: name, sub-genres,
 * count. Right: three real covers from that category, fanned; on hover they spread and the tile lifts.
 * The remaining categories sit behind "View all categories" as plain links. `categories` (flat list) is the
 * fallback while the tree loads or if it fails.
 */
const KEEP = 6;
type Top = { id?: number; slug?: string; name?: string; count: number; children: string[] };

function Fan({ categoryId }: { categoryId?: number }) {
  const books = useQuery({ ...catalogQueries.books({ category_id: categoryId, sort: "best_selling", per_page: 3 }), enabled: Boolean(categoryId), staleTime: 10 * 60_000 });
  const covers = (books.data?.data ?? []).slice(0, 3);
  const slots = [0, 1, 2];
  return (
    <span className="relative block h-28 w-32 shrink-0 sm:w-36" aria-hidden="true">
      {slots.map((i) => {
        const book = covers[i];
        return (
          <span
            key={i}
            className={cn(
              "absolute bottom-0 left-1/2 w-[4.2rem] origin-bottom transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
              i === 0 && "z-0 -translate-x-[105%] -rotate-[9deg] group-hover:-translate-x-[125%] group-hover:-rotate-[14deg]",
              i === 1 && "z-10 -translate-x-1/2 -translate-y-1.5 group-hover:-translate-y-3",
              i === 2 && "z-0 translate-x-[5%] rotate-[9deg] group-hover:translate-x-[25%] group-hover:rotate-[14deg]",
              "motion-reduce:transition-none",
            )}
          >
            {book || !books.isPending ? (
              <BookCover src={book?.cover_image_url} title={book?.title ?? ""} className="rounded-[3px] shadow-[0_12px_20px_-12px_rgb(20_16_10/0.65)]" />
            ) : (
              <span className="skeleton block aspect-[2/3] rounded-[3px]" />
            )}
          </span>
        );
      })}
    </span>
  );
}

export function CategoryTiles({ categories, loading }: { categories: Category[] | undefined; loading: boolean }) {
  const { dict } = useT();
  const h = dict.homePage;
  const tree = useQuery(catalogQueries.categoryTree());
  const [all, setAll] = useState(false);

  if ((loading || tree.isPending) && !tree.data) {
    return (
      <SkeletonGroup label={h.loadingCategories} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: KEEP }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
      </SkeletonGroup>
    );
  }

  const tops: Top[] = tree.data?.length
    ? tree.data.map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: c.total_books ?? 0, children: (c.children ?? []).map((k) => k.name ?? "").filter(Boolean) }))
    : (categories ?? []).filter((c) => !c.parent_id).map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: c.books_count ?? 0, children: [] }));
  const sorted = tops.filter((c) => c.slug && c.count > 0).sort((a, b) => b.count - a.count);
  const rest = sorted.slice(KEEP);

  return (
    <div className="grid gap-5">
      <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.slice(0, KEEP).map((category, index) => (
          <StaggerItem as="li" key={category.id} index={index}>
            <Link
              to={`/categories/${category.slug}`}
              className="group flex h-44 items-end justify-between gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 outline-none transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-[0_22px_36px_-24px_rgb(20_32_122/0.45)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
            >
              <span className="flex h-full min-w-0 flex-1 flex-col pr-1">
                <span className="line-clamp-2 text-balance font-display text-[1.3rem] leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">{category.name}</span>
                {category.children.length ? <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{category.children.slice(0, 4).join(" · ")}</span> : null}
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {dict.pages.bookCount(category.count)}
                  <ArrowRight className="size-4 text-primary transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </span>
              <Fan categoryId={category.id} />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      {rest.length ? (
        <>
          {all ? (
            <ul className="flex flex-wrap gap-2">
              {rest.map((category) => (
                <li key={category.id}>
                  <Link to={`/categories/${category.slug}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-input hover:bg-muted">
                    {category.name} <span className="text-xs tabular-nums text-muted-foreground">{category.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="mx-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {all ? dict.browse.showFewer : h.viewAllCategories}
            <ChevronDown className={cn("size-4 transition-transform duration-200", all && "rotate-180")} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
