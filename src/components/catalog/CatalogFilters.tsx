import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BookFilters } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FORMATS, LANGUAGES, withFilter } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Filter panel for the catalogue: sidebar at ≥ 1024px, inside a drawer below.
 * Single-choice groups are native radio buttons (one tab stop, arrow keys);
 * every change is applied straight to the URL. Price applies on submit.
 */

type Props = {
  filters: BookFilters;
  onChange: (next: BookFilters) => void;
  /** Filters fixed by the page (e.g. a category landing); their groups are hidden. */
  locked?: Partial<BookFilters>;
  idPrefix: string;
};

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-5">
      <fieldset className="grid gap-1">
        <legend className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{legend}</legend>
        {children}
      </fieldset>
    </div>
  );
}

function Choice({ name, checked, onSelect, label, count }: { name: string; checked: boolean; onSelect: () => void; label: string; count?: number }) {
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-1 text-[15px] hover:bg-secondary", checked && "font-semibold")}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="size-[18px] accent-primary" />
      <span className="flex-1">{label}</span>
      {count !== undefined ? <span className="text-sm tabular-nums text-muted-foreground">{count}</span> : null}
    </label>
  );
}

function PriceRange({ filters, onChange, idPrefix }: Props) {
  const { dict } = useT();
  const t = dict.browse;
  const [min, setMin] = useState(filters.min_price?.toString() ?? "");
  const [max, setMax] = useState(filters.max_price?.toString() ?? "");
  const [synced, setSynced] = useState({ min: filters.min_price, max: filters.max_price });
  if (synced.min !== filters.min_price || synced.max !== filters.max_price) {
    setSynced({ min: filters.min_price, max: filters.max_price });
    setMin(filters.min_price?.toString() ?? "");
    setMax(filters.max_price?.toString() ?? "");
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const toNumber = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) || Number(v) < 0 ? undefined : Number(v));
    let lo = toNumber(min);
    let hi = toNumber(max);
    if (lo !== undefined && hi !== undefined && hi < lo) [lo, hi] = [hi, lo];
    onChange(withFilter(withFilter(filters, "min_price", lo), "max_price", hi));
  };

  const field = "h-11 w-full rounded-md border border-input bg-card pl-6 pr-2 text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <form onSubmit={submit} className="grid gap-3" aria-label={t.priceRange}>
      <div className="grid grid-cols-2 gap-3">
        {(["min", "max"] as const).map((which) => (
          <div key={which} className="grid gap-1">
            <label htmlFor={`${idPrefix}-${which}`} className="text-sm font-medium">
              {which === "min" ? t.min : t.max}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                $
              </span>
              <input
                id={`${idPrefix}-${which}`}
                inputMode="decimal"
                value={which === "min" ? min : max}
                onChange={(e) => (which === "min" ? setMin(e.target.value) : setMax(e.target.value))}
                placeholder={which === "min" ? "0" : t.any}
                className={field}
              />
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" variant="outline" size="sm">
        {t.applyPrice}
      </Button>
    </form>
  );
}

export function CatalogFilters({ filters, onChange, locked = {}, idPrefix }: Props) {
  const categories = useQuery(catalogQueries.categories());
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const { dict } = useT();
  const t = dict.browse;
  const set = <K extends keyof BookFilters>(key: K, value: BookFilters[K] | undefined) => onChange(withFilter(filters, key, value));

  return (
    <div className="grid gap-5">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[15px] font-semibold">
        {t.inStockOnly}
        <Switch checked={filters.in_stock === true} onCheckedChange={(on) => set("in_stock", on || undefined)} />
      </label>

      {locked.category_id === undefined ? (
        <Group legend={t.category}>
          <Choice name={`${idPrefix}-category`} checked={filters.category_id === undefined} onSelect={() => set("category_id", undefined)} label={t.allCategories} />
          {(categories.data ?? []).map((c) => (
            <Choice key={c.id} name={`${idPrefix}-category`} checked={filters.category_id === c.id} onSelect={() => set("category_id", c.id)} label={c.name ?? ""} count={c.books_count} />
          ))}
        </Group>
      ) : null}

      <Group legend={t.format}>
        <Choice name={`${idPrefix}-format`} checked={filters.format === undefined} onSelect={() => set("format", undefined)} label={t.anyFormat} />
        {FORMATS.map((f) => (
          <Choice key={f.value} name={`${idPrefix}-format`} checked={filters.format === f.value} onSelect={() => set("format", f.value)} label={dict.formats[f.value]} />
        ))}
      </Group>

      <Group legend={t.price}>
        <PriceRange filters={filters} onChange={onChange} idPrefix={idPrefix} />
      </Group>

      <Group legend={t.language}>
        <Choice name={`${idPrefix}-language`} checked={filters.language === undefined} onSelect={() => set("language", undefined)} label={t.anyLanguage} />
        {LANGUAGES.map((l) => (
          <Choice key={l} name={`${idPrefix}-language`} checked={filters.language === l} onSelect={() => set("language", l)} label={t.languages[l] ?? l} />
        ))}
      </Group>

      {locked.publisher_id === undefined && (publishers.data?.data.length ?? 0) > 0 ? (
        <Group legend={t.publisher}>
          <Choice name={`${idPrefix}-publisher`} checked={filters.publisher_id === undefined} onSelect={() => set("publisher_id", undefined)} label={t.anyPublisher} />
          {(publishers.data?.data ?? []).map((p) => (
            <Choice key={p.id} name={`${idPrefix}-publisher`} checked={filters.publisher_id === p.id} onSelect={() => set("publisher_id", p.id)} label={p.name ?? ""} count={p.books_count} />
          ))}
        </Group>
      ) : null}
    </div>
  );
}
