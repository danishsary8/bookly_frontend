import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Category } from "@/api/types";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

/** Category tiles linking to /categories/:slug, largest categories first. */
export function CategoryTiles({ categories, loading }: { categories: Category[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <SkeletonGroup label="Loading categories…" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </SkeletonGroup>
    );
  }
  const sorted = [...(categories ?? [])].sort((a, b) => (b.books_count ?? 0) - (a.books_count ?? 0));
  return (
    <Stagger as="ul" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((category, index) => (
        <StaggerItem as="li" key={category.id} index={index}>
          <Link
            to={`/categories/${category.slug}`}
            className="group flex h-full min-h-24 flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow,background-color] duration-150 hover:border-input hover:bg-lapis-tint hover:shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-display text-xl leading-tight">{category.name}</span>
              <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </span>
            <span className="text-sm text-muted-foreground">
              {category.books_count ?? 0} {category.books_count === 1 ? "book" : "books"}
            </span>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
