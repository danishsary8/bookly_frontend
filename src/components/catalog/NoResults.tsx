import { SearchX, X } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { RelatedShelf } from "./RelatedShelf";

/*
 * Nothing matched (MASTER §6.6, pages/catalogue-v2.md §3). Never a dead end: each active filter can be dropped on
 * its own (`suggestions`, the same chips as above the grid), or all at once, or the visitor goes to every book; and
 * the shop's popular books sit underneath so there is always something to open.
 */
type Props = {
  title: string;
  lead: string;
  /** Removable filters, as buttons ("Paperback ×"). */
  suggestions?: { label: string; remove: () => void }[];
  onClearAll?: () => void;
};

export function NoResults({ title, lead, suggestions = [], onClearAll }: Props) {
  const { dict } = useT();
  const c = dict.catalogue;
  return (
    <div className="grid gap-10">
      <div className="shop-card mx-auto grid w-full max-w-2xl justify-items-center gap-3 rounded-2xl border border-border bg-card px-5 py-10 text-center sm:px-10">
        <div className="mb-1 grid size-20 place-items-center rounded-full bg-lapis-tint text-primary">
          <SearchX className="size-9" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="font-display text-[1.563rem] leading-tight">{title}</h2>
        <p className="max-w-md text-muted-foreground">{lead}</p>
        {suggestions.length > 0 ? (
          <div className="mt-2 grid justify-items-center gap-2">
            <p className="text-sm font-semibold">{c.tryRemoving}</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={s.remove}
                    aria-label={dict.browse.removeFilter(s.label)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-input bg-card px-4 text-sm font-semibold outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s.label}
                    <X className="size-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {onClearAll && suggestions.length > 1 ? (
            <button type="button" onClick={onClearAll} className={buttonVariants()}>
              {dict.browse.clearFilters}
            </button>
          ) : null}
          <Link to="/books" className={cn(buttonVariants({ variant: onClearAll && suggestions.length > 1 ? "outline" : "default" }))}>
            {dict.pages.browseAll}
          </Link>
        </div>
      </div>
      <RelatedShelf id="no-results-popular" title={c.popularNow} source={{ kind: "similar" }} seeAllHref="/books?sort=best_selling" />
    </div>
  );
}
