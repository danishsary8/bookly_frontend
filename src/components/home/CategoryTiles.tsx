import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { Category } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { ScrollProgress } from "@/components/ScrollProgress";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Home "Shop by category" (pages/home.md): the six biggest top-level categories as wide tiles. Left: name, sub-genres,
 * count. Right: three real covers from that category, fanned; on hover they spread and the tile lifts.
 * With more than six, every category is shown: the same tiles in two rows that scroll sideways (arrows). `categories` (flat list) is the
 * fallback while the tree loads or if it fails.
 */
const KEEP = 6;
// Cloth-inspired accents keep the category cards related to the bookshelf.
const CATEGORY_ACCENTS = ["#7A2E2A", "#14207A", "#C9A24B", "#2F5D4A", "#5B2A4E", "#1E4E5C"];
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
              i === 0 && "z-0 -translate-x-[105%] -rotate-[9deg] motion-safe:group-hover:-translate-x-[125%] motion-safe:group-hover:-rotate-[14deg] motion-safe:group-focus-visible:-translate-x-[125%] motion-safe:group-focus-visible:-rotate-[14deg]",
              i === 1 && "z-10 -translate-x-1/2 -translate-y-1.5 motion-safe:group-hover:-translate-y-3 motion-safe:group-focus-visible:-translate-y-3",
              i === 2 && "z-0 translate-x-[5%] rotate-[9deg] motion-safe:group-hover:translate-x-[25%] motion-safe:group-hover:rotate-[14deg] motion-safe:group-focus-visible:translate-x-[25%] motion-safe:group-focus-visible:rotate-[14deg]",
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

/** The section header, the same as the book shelves' (New arrivals): eyebrow, title, "All books", then the arrows. */
function Header({ id, eyebrow, title, allHref, allLabel, arrows }: { id: string; eyebrow: string; title: string; allHref: string; allLabel: string; arrows?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px w-12 bg-current" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-2 font-display text-[1.953rem] leading-tight">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <Link to={allHref} className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
          {allLabel} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {arrows}
      </div>
    </div>
  );
}

export function CategoryTiles({ categories, loading, headingId, eyebrow, title, allHref, allLabel }: { categories: Category[] | undefined; loading: boolean; headingId: string; eyebrow: string; title: string; allHref: string; allLabel: string }) {
  const { dict } = useT();
  const h = dict.homePage;
  const tree = useQuery(catalogQueries.categoryTree());
  const track = useRef<HTMLUListElement>(null);
  const bar = useScrollProgress(track, [tree.data?.length, categories?.length, loading]);
  // Like the book shelves: an arrow greys out at its end of the row.
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [tree.data?.length, categories?.length, loading]);
  const header = (arrows?: React.ReactNode) => <Header id={headingId} eyebrow={eyebrow} title={title} allHref={allHref} allLabel={allLabel} arrows={arrows} />;

  if ((loading || tree.isPending) && !tree.data) {
    return (
      <div className="grid gap-5">
        {header()}
        <SkeletonGroup label={h.loadingCategories} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: KEEP }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </SkeletonGroup>
      </div>
    );
  }

  const tops: Top[] = tree.data?.length
    ? tree.data.map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: c.total_books ?? 0, children: (c.children ?? []).map((k) => k.name ?? "").filter(Boolean) }))
    : (categories ?? []).filter((c) => !c.parent_id).map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: c.books_count ?? 0, children: [] }));
  const sorted = tops.filter((c) => c.slug && c.count > 0).sort((a, b) => b.count - a.count);
  // Tiles look the same as before; with more than six categories they scroll sideways in a row of 3-column pages
  // (two rows when there are many), so every category is on the home page.
  const scroll = (dir: number) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollBy({ left: dir * track.current.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };
  const many = sorted.length > KEEP;

  const tile = (category: Top, index: number) => (
    <Link
      to={`/categories/${category.slug}`}
      className="category-tile group flex h-44 items-end justify-between gap-3 overflow-hidden rounded-2xl border p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ "--category-accent": CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length] } as CSSProperties}
    >
      <span className="flex h-full min-w-0 flex-1 flex-col pr-1">
        <span className="line-clamp-2 text-balance font-display text-[1.3rem] leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">{category.name}</span>
        {category.children.length ? <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{category.children.slice(0, 4).join(" · ")}</span> : null}
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {dict.pages.bookCount(category.count)}
          <ArrowRight className="size-4 text-primary transition-transform duration-300 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </span>
      <Fan categoryId={category.id} />
    </Link>
  );

  if (!many) {
    return (
      <div className="grid gap-5">
        {header()}
        <Stagger as="ul" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((category, index) => (
            <StaggerItem as="li" key={category.id} index={index}>
              {tile(category, index)}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {header(
        <div className="hidden gap-2 sm:flex">
          <span className="sr-only">{h.categoryCount(sorted.length)}</span>
          <Button variant="outline" size="icon" onClick={() => scroll(-1)} disabled={edges.start} aria-label={h.prevCategories}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => scroll(1)} disabled={edges.end} aria-label={h.nextCategories}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>,
      )}
      <ul
        ref={track}
        className="shelf-row-more no-scrollbar -mx-2 grid snap-x grid-flow-col grid-rows-2 gap-4 overflow-x-auto px-2 pb-3 pt-1 [grid-auto-columns:82%] sm:[grid-auto-columns:calc((100%-1rem)/2)] xl:[grid-auto-columns:calc((100%-2rem)/3)]"
      >
        {sorted.map((category, index) => (
          <li key={category.id} className="snap-start">
            {tile(category, index)}
          </li>
        ))}
      </ul>
      <ScrollProgress bar={bar} />
    </div>
  );
}
