import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
 * With more than six, every category is shown: the same tiles in two rows that scroll sideways (arrows). `categories` (flat list) is the
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
  const track = useRef<HTMLUListElement>(null);

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
  // Tiles look the same as before; with more than six categories they scroll sideways in a row of 3-column pages
  // (two rows when there are many), so every category is on the home page.
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth, behavior: "smooth" });
  const many = sorted.length > KEEP;
  const arrow = "grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,border-color] hover:border-input hover:bg-muted";

  const tile = (category: Top) => (
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
  );

  if (!many) {
    return (
      <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((category, index) => (
          <StaggerItem as="li" key={category.id} index={index}>
            {tile(category)}
          </StaggerItem>
        ))}
      </Stagger>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="-mt-[4.25rem] flex items-center justify-end gap-2 pr-28 max-sm:mt-0 max-sm:pr-0">
        <span className="sr-only">{h.categoryCount(sorted.length)}</span>
        <button type="button" onClick={() => scroll(-1)} className={arrow} aria-label={h.prevCategories}>
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => scroll(1)} className={arrow} aria-label={h.nextCategories}>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ul
        ref={track}
        className="shelf-row-more no-scrollbar -mx-2 grid snap-x grid-flow-col grid-rows-2 gap-4 overflow-x-auto px-2 pb-3 pt-1 [grid-auto-columns:calc((100%-2rem)/3)]"
      >
        {sorted.map((category) => (
          <li key={category.id} className="snap-start">
            {tile(category)}
          </li>
        ))}
      </ul>
    </div>
  );
}
