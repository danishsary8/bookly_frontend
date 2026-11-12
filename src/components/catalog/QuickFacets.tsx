import type { BookFacets, BookFilters } from "@/api/endpoints/catalog";
import { GRADES, LEVELS, withFilter } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * School grade and English level as one tap each, above the results (pages/catalogue-v2.md §3: Education). They also
 * replace the panel's groups inside a category: a parent looking for "Grade 9" should not have to find the panel
 * first. Shown when the books on screen have a grade (or level); writes the same URL filter as the panel.
 */
export function QuickFacets({ filters, facets, onChange }: { filters: BookFilters; facets?: BookFacets; onChange: (next: BookFilters) => void }) {
  const { dict } = useT();
  const f = dict.catalogFilters;
  const grades = GRADES.filter((g) => (facets?.school_grades?.[String(g)] ?? 0) > 0 || filters.school_grade === g);
  const levels = LEVELS.filter((l) => (facets?.levels?.[l] ?? 0) > 0 || filters.level === l);

  const row = <T extends number | string>(label: string, all: string, values: readonly T[], selected: T | undefined, name: (v: T) => string, set: (v: T | undefined) => void) =>
    values.length >= 1 ? (
      // One sideways-scrolling row on phones and tablets (like the category chips), wrapping on laptops.
      <div role="group" aria-label={label} className="chip-row no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5 lg:flex-wrap lg:overflow-visible">
        <span className="mr-1 shrink-0 text-sm font-semibold text-muted-foreground">{label}</span>
        {[undefined, ...values].map((value) => {
          const active = value === selected;
          return (
            <button
              key={String(value ?? "all")}
              type="button"
              aria-pressed={active}
              onClick={() => set(value)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-input hover:bg-secondary",
              )}
            >
              {value === undefined ? all : name(value)}
            </button>
          );
        })}
      </div>
    ) : null;

  const gradeRow = row(f.grade, dict.catalogue.allGrades, grades, filters.school_grade as (typeof GRADES)[number] | undefined, (g) => f.gradeN(g), (g) => onChange(withFilter(filters, "school_grade", g)));
  const levelRow = row(f.level, dict.catalogue.allLevels, levels, filters.level as (typeof LEVELS)[number] | undefined, (l) => l, (l) => onChange(withFilter(filters, "level", l)));
  if (!gradeRow && !levelRow) return null;
  return (
    <div className="grid gap-3">
      {gradeRow}
      {levelRow}
    </div>
  );
}
