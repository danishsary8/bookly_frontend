import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { Category } from "@/api/types";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Home "Shop by category" (pages/home.md): a quiet typographic index instead of boxes. Top-level categories only
 * (largest first), each a row: name, its sub-genres in small type, the book count, and an arrow that slides in on
 * hover while a blue rule draws under the row. The first 8 show; "Show all" opens the rest.
 * `categories` (flat list) is the fallback while the tree loads or if it fails.
 */
const KEEP = 8;

export function CategoryTiles({ categories, loading }: { categories: Category[] | undefined; loading: boolean }) {
  const { dict } = useT();
  const h = dict.homePage;
  const tree = useQuery(catalogQueries.categoryTree());
  const [all, setAll] = useState(false);

  if (loading && !tree.data) {
    return (
      <SkeletonGroup label={h.loadingCategories} className="grid gap-x-12 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="my-2 h-12 rounded-md" />
        ))}
      </SkeletonGroup>
    );
  }

  const tops = tree.data?.length
    ? tree.data.map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: c.total_books ?? 0, children: (c.children ?? []).map((k) => k.name ?? "").filter(Boolean) }))
    : (categories ?? []).filter((c) => !c.parent_id).map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: c.books_count ?? 0, children: [] as string[] }));
  const sorted = tops.filter((c) => c.slug && c.count > 0).sort((a, b) => b.count - a.count);
  const shown = all ? sorted : sorted.slice(0, KEEP);

  return (
    <div className="grid gap-5">
      <Stagger as="ul" className="grid gap-x-12 border-t border-border sm:grid-cols-2">
        {shown.map((category, index) => (
          <StaggerItem as="li" key={category.id} index={index}>
            <Link
              to={`/categories/${category.slug}`}
              className="group relative flex min-h-[4.5rem] items-center gap-4 border-b border-border py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-7 shrink-0 text-xs tabular-nums text-muted-foreground" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 transition-transform duration-300 ease-out group-hover:translate-x-1.5 motion-reduce:group-hover:translate-x-0">
                <span className="block truncate font-display text-xl leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">{category.name}</span>
                {category.children.length ? <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{category.children.slice(0, 4).join(" · ")}</span> : null}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{dict.pages.bookCount(category.count)}</span>
              <ArrowRight className="size-4 shrink-0 -translate-x-2 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
              {/* the blue rule draws across on hover */}
              <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden="true" />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      {sorted.length > KEEP ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mx-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {all ? dict.browse.showFewer : dict.browse.showAllN(sorted.length)}
          <ChevronDown className={cn("size-4 transition-transform duration-200", all && "rotate-180")} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
