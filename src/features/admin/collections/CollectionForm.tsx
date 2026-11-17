import { useDeferredValue, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { catalogQueries } from "@/api/endpoints/catalog";
import { staffApi } from "@/api/endpoints/staff";
import { opsApi, type BookCollectionInput, type StaffBookCollection } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/stores/toast";

/*
 * The collection editor as a page (owner 2026-11-17: a page instead of the dialog). Text and books on the left, home
 * page settings on the right; the book picker filters by category. Used by /admin/collections/new and /:id.
 */

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid min-w-0 grid-cols-1 content-start gap-4 desk-card rounded-xl border border-border bg-card p-5 sm:p-6">
      <header className="grid gap-0.5">
        <h2 id={id} className="font-sans text-[1.0625rem] font-semibold tracking-normal">
          {title}
        </h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

const MAX_BOOKS = 60;

const toLocalInput = (iso: string | null) =>
  iso
    ? new Date(
        new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000,
      )
        .toISOString()
        .slice(0, 16)
    : "";

const nullIfEmpty = (s: string) => (s.trim() ? s.trim() : null);

type PickedBook = { id: number; title: string };

/** Search to add a book at the end; the list keeps the order customers see, moved with ↑ / ↓. */
function BookPicker({
  value,
  onChange,
  error,
}: {
  value: PickedBook[];
  onChange: (next: PickedBook[]) => void;
  error?: string;
}) {
  const [text, setText] = useState("");
  const q = useDeferredValue(text.trim());
  // Narrow by category too (owner 2026-11-17).
  const [category, setCategory] = useState("");
  const categories = useQuery(catalogQueries.categories());
  const books = useQuery({
    // Books show straight away (A–Z) so staff can browse; typing 2+ letters searches (owner 2026-11-16).
    queryKey: ["staff", "collections", "book-search", q.length >= 2 ? q : "", category],
    queryFn: () => staffApi.books({ ...(q.length >= 2 ? { q } : {}), ...(category ? { category_id: Number(category) } : {}), sort: "title", per_page: q.length >= 2 ? 12 : 30 }),
    placeholderData: (previous) => previous,
  });
  const full = value.length >= MAX_BOOKS;
  const results = full
    ? []
    : (books.data?.data ?? []).filter(
        (b) => !value.some((v) => v.id === b.id),
      );
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor="collection-book-search"
          className="text-sm font-semibold"
        >
          Books
        </label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {value.length} of {MAX_BOOKS}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="collection-book-search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={full}
          placeholder={
            full
              ? "The list is full"
              : "Search titles, or pick from the list below"
          }
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "collection-books-error" : undefined}
          className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-[invalid=true]:border-destructive"
        />
      </div>
      <label className="sr-only" htmlFor="collection-book-category">Category</label>
      <select
        id="collection-book-category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
      >
        <option value="">All categories</option>
        {(categories.data ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.parent_id ? `— ${c.name}` : c.name}
          </option>
        ))}
      </select>
      </div>
      {results.length ? (
        <ul
          className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-border bg-card p-1"
          aria-label="Search results"
        >
          {results.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, { id: b.id, title: b.title }]);
                  setText("");
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="truncate">{b.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : q.length >= 2 && !books.isFetching ? (
        <p className="text-sm text-muted-foreground">
          Nothing new found for “{q}”.
        </p>
      ) : null}
      {value.length ? (
        <ol
          className="grid grid-cols-1 divide-y divide-border rounded-md border border-border"
          aria-label="Books in this collection, in order"
        >
          {value.map((b, i) => (
            <li
              key={b.id}
              className="flex items-center gap-2 py-1 pl-3 pr-1 text-sm"
            >
              <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
                {i + 1}.
              </span>
              <span className="min-w-0 flex-1 truncate">{b.title}</span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${b.title} up`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${b.title} down`}
                disabled={i === value.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${b.title}`}
                onClick={() => onChange(value.filter((v) => v.id !== b.id))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          No books yet. A collection with no books on sale does not show in the
          shop.
        </p>
      )}
      {error ? (
        <p id="collection-books-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Values = {
  title_en: string;
  title_km: string;
  description_en: string;
  description_km: string;
  slug: string;
  starts_at: string;
  ends_at: string;
  position: string;
  is_active: boolean;
  books: PickedBook[];
};
type Errors = Partial<Record<keyof Values | "form", string>>;

export function CollectionForm({
  collection,
  onClose,
}: {
  collection: StaffBookCollection | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const trashed = (collection?.books ?? []).filter((b) => b.in_trash);
  const [v, setV] = useState<Values>({
    title_en: collection?.title_en ?? "",
    title_km: collection?.title_km ?? "",
    description_en: collection?.description_en ?? "",
    description_km: collection?.description_km ?? "",
    slug: collection?.slug ?? "",
    starts_at: toLocalInput(collection?.starts_at ?? null),
    ends_at: toLocalInput(collection?.ends_at ?? null),
    position: String(collection?.position ?? 0),
    is_active: collection?.is_active ?? false, // new collections start off: switch them on from the list once checked
    books: (collection?.books ?? [])
      .filter((b) => !b.in_trash)
      .map(({ id, title }) => ({ id, title })),
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = (patch: Partial<Values>) => setV((cur) => ({ ...cur, ...patch }));

  const save = useMutation({
    mutationFn: (input: BookCollectionInput) =>
      collection
        ? opsApi.updateCollection(collection.id, input)
        : opsApi.createCollection(input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: ["staff", "collections"],
      });
      toast.success(
        collection ? `${saved.title_en} saved` : `${saved.title_en} created`,
      );
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      const next: Errors = {};
      for (const f of [
        "title_en",
        "title_km",
        "description_en",
        "description_km",
        "slug",
        "starts_at",
        "ends_at",
        "position",
        "books",
      ] as const) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
    },
  });

  const position = Number(v.position);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    if (!v.title_en.trim())
      e.title_en = "Give the collection an English title.";
    if (v.slug.trim() && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug.trim()))
      e.slug =
        "Use small letters, numbers and single dashes, like rainy-season-reads.";
    if (v.slug.trim() === "live")
      e.slug = "“live” is already used by the shop. Choose another.";
    if (!(/^\d+$/.test(v.position.trim()) && position <= 1000))
      e.position = "Enter a whole number from 0 to 1000.";
    if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at)
      e.ends_at = "The end must be after the start.";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate({
      title_en: v.title_en.trim(),
      title_km: nullIfEmpty(v.title_km),
      description_en: nullIfEmpty(v.description_en),
      description_km: nullIfEmpty(v.description_km),
      ...(v.slug.trim() ? { slug: v.slug.trim() } : {}), // empty on a new one: the API makes it from the English title
      starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null,
      ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
      position,
      is_active: v.is_active,
      books: v.books.map((b) => b.id),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <div className="grid min-w-0 grid-cols-1 gap-6">
        {errors.form ? <FormAlert title={errors.form} /> : null}
        <Section id="collection-text" title="Name and text" hint="What customers read on the home page row and the collection page.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Title (English)"
              value={v.title_en}
              onChange={(e) => set({ title_en: e.target.value })}
              error={errors.title_en}
              maxLength={120}
            />
            <TextField
              label="Title (Khmer)"
              optional
              lang="km"
              hint="Empty: Khmer readers see the English title."
              value={v.title_km}
              onChange={(e) => set({ title_km: e.target.value })}
              error={errors.title_km}
              maxLength={120}
            />
            <TextAreaField
              label="Description (English)"
              optional
              rows={2}
              value={v.description_en}
              onChange={(e) => set({ description_en: e.target.value })}
              error={errors.description_en}
              maxLength={300}
            />
            <TextAreaField
              label="Description (Khmer)"
              optional
              lang="km"
              rows={2}
              value={v.description_km}
              onChange={(e) => set({ description_km: e.target.value })}
              error={errors.description_km}
              maxLength={300}
            />
          </div>
        </Section>
        <Section id="collection-books" title="Books on the shelf" hint="Pick up to 60. The order here is the order on the shelf.">
          {trashed.length ? (
            <p className="text-sm text-muted-foreground">
              {trashed.length === 1
                ? "1 book is"
                : `${trashed.length} books are`}{" "}
              in the trash and will leave this collection when you save:{" "}
              {trashed.map((b) => b.title).join(", ")}.
            </p>
          ) : null}
          <BookPicker
            value={v.books}
            onChange={(books) => set({ books })}
            error={errors.books}
          />
        </Section>
      </div>
      <aside className="grid min-w-0 grid-cols-1 gap-4 xl:sticky xl:top-24">
        <Section id="collection-home" title="On the home page">
          <div className="grid grid-cols-1 gap-4 ">
            <TextField
              label="Web address"
              optional={!collection}
              hint={
                collection
                  ? "Changing it breaks links already shared."
                  : "Empty: made from the English title, like rainy-season-reads."
              }
              value={v.slug}
              onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
              error={errors.slug}
              maxLength={120}
              autoComplete="off"
            />
            <TextField
              label="Order on the home page"
              inputMode="numeric"
              hint="Lower comes first."
              value={v.position}
              onChange={(e) => set({ position: e.target.value })}
              error={errors.position}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <TextField
              label="Starts"
              optional
              type="datetime-local"
              value={v.starts_at}
              onChange={(e) => set({ starts_at: e.target.value })}
              error={errors.starts_at}
            />
            <TextField
              label="Ends"
              optional
              type="datetime-local"
              value={v.ends_at}
              onChange={(e) => set({ ends_at: e.target.value })}
              error={errors.ends_at}
            />
          </div>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border px-4 py-2">
            <span className="grid">
              <span className="font-semibold">On</span>
              <span className="text-sm text-muted-foreground">
                The home page shows the first 2 live collections.
              </span>
            </span>
            <Switch
              checked={v.is_active}
              onCheckedChange={(checked) => set({ is_active: checked })}
            />
          </label>
        </Section>
      </aside>
      <div className="admin-form-actions flex flex-wrap items-center justify-end gap-3 xl:col-span-2">
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {collection ? "Save collection" : "Create collection"}
        </Button>
      </div>
    </form>
  );
}

