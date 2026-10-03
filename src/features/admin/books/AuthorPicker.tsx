import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { catalogQueries } from "@/api/endpoints/catalog";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type Picked = { id: number; name: string };

/*
 * Authors for a book: the chosen ones as removable chips, and a search that lists
 * matching authors to add (API search on name). New authors are created on the
 * Authors screen.
 */
export function AuthorPicker({ value, names, onChange, error }: { value: number[]; names: Record<number, string>; onChange: (ids: number[], picked?: Picked) => void; error?: string }) {
  const id = useId();
  const [q, setQ] = useState("");
  const term = useDebouncedValue(q.trim(), 250);
  const results = useQuery({ ...catalogQueries.authors({ q: term, per_page: 8 }), enabled: term.length > 0 });
  const options = (results.data?.data ?? []).filter((a) => a.id && !value.includes(a.id));

  return (
    <fieldset className="grid gap-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1 text-[15px] font-semibold">Authors</legend>
      {value.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen authors">
          {value.map((authorId) => (
            <li key={authorId} className="inline-flex items-center gap-1 rounded-md border border-border bg-lapis-tint py-1 pl-3 pr-1 text-[15px] font-medium text-primary">
              {names[authorId] ?? `Author #${authorId}`}
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${names[authorId] ?? "author"}`} onClick={() => onChange(value.filter((v) => v !== authorId))}>
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No authors yet.</p>
      )}
      <label htmlFor={`${id}-search`} className="sr-only">
        Find an author to add
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Find an author to add"
        autoComplete="off"
        className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {term ? (
        <ul className="grid gap-1 rounded-md border border-border bg-card p-1" aria-live="polite" aria-label="Matching authors">
          {results.isPending ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No other authors match "{term}". Add them on the Authors screen first.</li>
          ) : (
            options.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange([...value, a.id!], { id: a.id!, name: a.name ?? "" });
                    setQ("");
                  }}
                  className="flex min-h-10 w-full items-center gap-2 rounded-[4px] px-3 text-left text-[15px] outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4 text-primary" aria-hidden="true" /> {a.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
