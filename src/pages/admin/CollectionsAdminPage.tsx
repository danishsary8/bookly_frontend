import { useDeferredValue, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { staffApi } from "@/api/endpoints/staff";
import {
  opsApi,
  opsQueries,
  type BookCollectionInput,
  type BookCollectionStatus,
  type StaffBookCollection,
} from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { AdminPage } from "@/features/admin/AdminPage";
import {
  ListState,
  SearchBox,
  TableCard,
  td,
  th,
  thead,
} from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { toast } from "@/stores/toast";

/*
 * /admin/collections: seasonal collections (owner 2026-11-01: home row + own page, up to 2 live, books picked by hand,
 * English + Khmer fields). Same shape as Offers: a table and a dialog. Staff see the list; only admins create, change,
 * switch on/off or delete (the API enforces it too). The home page shows the first 2 live ones by position.
 */

const MAX_BOOKS = 60;

const STATUS: Record<
  BookCollectionStatus,
  { label: string; tone: "success" | "warning" | "neutral"; live?: boolean }
> = {
  live: { label: "Live", tone: "success", live: true },
  scheduled: { label: "Scheduled", tone: "warning" },
  hidden: { label: "Off", tone: "neutral" },
  ended: { label: "Ended", tone: "neutral" },
};

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
  const books = useQuery({
    queryKey: ["staff", "collections", "book-search", q],
    queryFn: () => staffApi.books({ q, per_page: 8 }),
    enabled: q.length >= 2,
  });
  const full = value.length >= MAX_BOOKS;
  const results =
    q.length < 2
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
    <div className="grid gap-2">
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
      <div className="relative">
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
              : "Type 2+ letters of a title to add a book"
          }
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "collection-books-error" : undefined}
          className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-[invalid=true]:border-destructive"
        />
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

function CollectionDialog({
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
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="lg">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {collection ? `Edit ${collection.title_en}` : "New collection"}
            </DialogTitle>
            <DialogDescription>
              A hand-picked shelf like “Rainy season reads”. While it is live it
              shows as a row on the home page and has its own page.
            </DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert title={errors.form} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-4 py-2">
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>
              {collection ? "Save collection" : "Create collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const when = (c: StaffBookCollection) =>
  c.starts_at && new Date(c.starts_at) > new Date()
    ? `From ${orderDate(c.starts_at)}`
    : c.ends_at
      ? `Until ${orderDate(c.ends_at)}`
      : "No end";

export default function CollectionsAdminPage() {
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const { get, page, set, hrefFor } = useListParams();
  const q = get("q");
  const collections = useQuery(
    opsQueries.collections({ q: q || undefined, page, per_page: 25 }),
  );
  const [editing, setEditing] = useState<StaffBookCollection | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<StaffBookCollection | null>(null);

  const toggle = useMutation({
    mutationFn: ({ c, on }: { c: StaffBookCollection; on: boolean }) =>
      opsApi.updateCollection(c.id, { is_active: on }),
    onSuccess: (saved) => {
      toast.success(
        saved.is_active
          ? `${saved.title_en} is on`
          : `${saved.title_en} is off`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["staff", "collections"],
      });
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't change the collection",
        description: ApiError.from(error).message,
      }),
  });
  const remove = useMutation({
    mutationFn: (c: StaffBookCollection) => opsApi.deleteCollection(c.id),
    onSuccess: (_r, c) => {
      toast.success(`${c.title_en} deleted`);
      void queryClient.invalidateQueries({
        queryKey: ["staff", "collections"],
      });
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't delete the collection",
        description: ApiError.from(error).message,
      }),
    onSettled: () => setDeleting(null),
  });

  const meta = collections.data?.meta;
  const list = collections.data?.data ?? [];
  // Before the backend with collections is deployed, /staff/collections is a 404: say so instead of an error page.
  const notYet =
    collections.isError && ApiError.from(collections.error).status === 404;

  return (
    <AdminPage
      title="Collections"
      lead={
        meta && meta.total
          ? `${rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "collection" : "collections")} · the home page shows the first 2 live ones`
          : "Hand-picked seasonal shelves for the home page, like “Rainy season reads”."
      }
      actions={
        isAdmin && !notYet ? (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New collection
          </Button>
        ) : !isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Only admins create or change collections.
          </p>
        ) : null
      }
    >
      {notYet ? (
        <EmptyState
          icon={Sparkles}
          title="Collections are not available yet"
          description="The API on this server does not have collections yet. They appear here once the backend update is deployed."
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              label="Search collections"
              value={q}
              placeholder="Title"
              onSearch={(val) => set({ q: val || undefined })}
            />
          </div>
          <ListState
            query={collections}
            empty={{
              when: list.length === 0,
              icon: Sparkles,
              title: "No collections match",
              description: q
                ? "Check the title."
                : "Create one for the next season or holiday.",
            }}
          >
            <TableCard stale={collections.isPlaceholderData} minWidth={820}>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={th}>
                    Collection
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Books
                  </th>
                  <th scope="col" className={th}>
                    Status
                  </th>
                  <th scope="col" className={th}>
                    When
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Order
                  </th>
                  <th scope="col" className={th}>
                    On
                  </th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((c) => {
                  const status = STATUS[c.status] ?? STATUS.hidden;
                  const inTrash = c.books.filter((b) => b.in_trash).length;
                  return (
                    <tr key={c.id}>
                      <th scope="row" className={`${td} font-semibold`}>
                        {c.title_en}
                        <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                          {c.title_km ? (
                            <span lang="km">{c.title_km} · </span>
                          ) : null}
                          /collections/{c.slug}
                        </span>
                      </th>
                      <td className={`${td} text-right tabular-nums`}>
                        {c.books.length - inTrash}
                        {inTrash ? (
                          <span className="block text-xs text-muted-foreground">
                            +{inTrash} in trash
                          </span>
                        ) : null}
                      </td>
                      <td className={td}>
                        <Badge
                          tone={status.tone}
                          shape={status.live ? "tint" : "outline"}
                        >
                          {status.live ? (
                            <CheckCircle2 aria-hidden="true" />
                          ) : (
                            <CircleSlash aria-hidden="true" />
                          )}{" "}
                          {status.label}
                        </Badge>
                      </td>
                      <td
                        className={`${td} whitespace-nowrap text-sm text-muted-foreground`}
                      >
                        {when(c)}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {c.position}
                      </td>
                      <td className={td}>
                        <Switch
                          checked={c.is_active}
                          disabled={!isAdmin || toggle.isPending}
                          aria-label={`${c.is_active ? "Turn off" : "Turn on"} ${c.title_en}`}
                          onCheckedChange={(on) => toggle.mutate({ c, on })}
                        />
                      </td>
                      <td className={td}>
                        <div className="flex justify-end gap-1">
                          {c.status === "live" ? (
                            <Button size="icon" variant="ghost" asChild>
                              <Link
                                to={`/collections/${c.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${c.title_en} in the shop (new tab)`}
                              >
                                <ExternalLink aria-hidden="true" />
                              </Link>
                            </Button>
                          ) : null}
                          {isAdmin ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Edit ${c.title_en}`}
                                onClick={() => setEditing(c)}
                              >
                                <Pencil aria-hidden="true" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Delete ${c.title_en}`}
                                onClick={() => setDeleting(c)}
                              >
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          </ListState>
          <Pagination
            page={meta?.current_page ?? 1}
            lastPage={meta?.last_page ?? 1}
            hrefFor={hrefFor}
          />
        </>
      )}
      {editing ? (
        <CollectionDialog
          key={editing === "new" ? "new" : editing.id}
          collection={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.title_en ?? "collection"}?`}
        description="It leaves the home page and its page stops working. The books themselves are not touched. To hide it for now, switch it off instead."
        confirmLabel="Delete collection"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </AdminPage>
  );
}
