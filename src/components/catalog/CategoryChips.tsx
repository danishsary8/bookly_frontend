import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import type { BookFilters } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { withFilter } from "@/lib/catalog";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Category chips above the catalogue: "All" + every top-level category with its book count; once one is chosen,
 * its sub-genres appear as a second, smaller row. One tap to browse, on every screen size (scrolls sideways on
 * phones, with faded edges). The active chip's blue pill slides between chips. Writes category_id to the URL.
 */
export function CategoryChips({ filters, onChange, counts }: { filters: BookFilters; onChange: (next: BookFilters) => void; counts?: Record<string, number> }) {
  const { dict } = useT();
  const t = dict.browse;
  const tree = useQuery(catalogQueries.categoryTree());
    // With other filters on (and no category yet), hide categories that would show nothing.
  const tops = (tree.data ?? []).filter((c) => c.id === filters.category_id || (counts ? (counts[String(c.id)] ?? 0) > 0 : (c.total_books ?? 0) > 0));
  if (tops.length === 0) return null;

  const selected = filters.category_id;
  const openTop = tops.find((c) => c.id === selected || (c.children ?? []).some((child) => child.id === selected));
  const children = (openTop?.children ?? []).filter((c) => (c.total_books ?? 0) > 0 || c.id === selected);
  const pick = (id: number | undefined) => onChange(withFilter(filters, "category_id", id));

  const chip = (active: boolean, small = false) =>
    cn(
      "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
      small ? "min-h-9 px-3.5 text-[13px]" : "min-h-10 px-4 text-sm",
      active ? "border-transparent text-primary-foreground" : "border-border bg-card text-foreground hover:border-input hover:bg-muted",
    );

  return (
    <nav aria-label={t.category} className="grid gap-2.5">
      <ul className="chip-row no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {[{ id: undefined, name: t.allCategories, total_books: undefined }, ...tops].map((c) => {
          const active = c.id === undefined ? selected === undefined : openTop?.id === c.id;
          return (
            <li key={c.id ?? "all"}>
              <button type="button" aria-pressed={active} onClick={() => pick(c.id)} className={chip(active)}>
                {active ? <m.span layoutId="category-chip" transition={transitions.toggle} className="absolute inset-0 rounded-full bg-primary" aria-hidden="true" /> : null}
                <span className="relative">{c.name}</span>
                {c.total_books ? <span className={cn("relative text-xs tabular-nums", active ? "text-primary-foreground/75" : "text-muted-foreground")}>{c.total_books}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {openTop && children.length > 0 ? (
        <ul className="chip-row no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5" aria-label={dict.catalogFilters.allOf(openTop.name ?? "")}>
          <li>
            <button type="button" aria-pressed={selected === openTop.id} onClick={() => pick(openTop.id)} className={cn(chip(false, true), selected === openTop.id && "border-primary bg-lapis-tint text-primary")}>
              {t.allIn(openTop.name ?? "")}
            </button>
          </li>
          {children.map((child) => (
            <li key={child.id ?? child.name}>
              <button type="button" aria-pressed={selected === child.id} onClick={() => pick(child.id)} className={cn(chip(false, true), selected === child.id && "border-primary bg-lapis-tint text-primary")}>
                {child.name}
                <span className="text-xs tabular-nums text-muted-foreground">{child.total_books}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
