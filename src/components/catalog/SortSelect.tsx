import type { BookSort } from "@/api/endpoints/catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SORTS, sortLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/** The catalogue's sort control (MASTER §6.14 listbox). "Best match" is offered only while searching. */
export function SortSelect({ value, searching, onChange, className }: { value: BookSort; searching: boolean; onChange: (sort: BookSort) => void; className?: string }) {
  const { dict } = useT();
  const id = "catalogue-sort-label";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span id={id} className="sr-only text-sm font-medium text-muted-foreground xl:not-sr-only">
        {dict.browse.sortBy}
      </span>
      <Select value={value} onValueChange={(next) => onChange(next as BookSort)}>
        <SelectTrigger aria-labelledby={id} className="h-11 w-[11.5rem] min-w-0 max-w-full text-[15px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORTS.filter((s) => s.value !== "relevance" || searching).map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {sortLabel(dict, s.value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
