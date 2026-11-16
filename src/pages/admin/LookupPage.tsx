import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, FolderTree, Pencil, Plus, Search, Trash2, ListOrdered, UserRound } from "lucide-react";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import "@/features/admin/catalogue.css";
import { SeriesVolumesDialog } from "@/features/admin/SeriesVolumesDialog";
import { useSearchParams } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { staffApi, type LookupKind } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { FilterSelect, SearchBox } from "@/features/admin/listKit";
import { StrictDeleteDialog } from "@/features/admin/StrictDeleteDialog";
import { LOOKUPS, type LookupRow } from "@/features/admin/lookups";
import { CategoryIcon, CATEGORY_ICON_OPTIONS } from "@/features/catalog/categoryIcons";
import { useStaff } from "@/features/admin/staffSession";
import { rangeSummary } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

const PER_PAGE = 25;

/** Categories: top-level ones first (admin order), each followed by its sub-categories. */
function asTree(rows: LookupRow[]): LookupRow[] {
  const byOrder = (a: LookupRow, b: LookupRow) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name));
  const tops = rows.filter((r) => r.parent_id == null).sort(byOrder);
  const placed = tops.flatMap((top) => [top, ...rows.filter((r) => r.parent_id === top.id).sort(byOrder)]);
  // A sub-category whose parent is gone (shouldn't happen) still shows, at the end.
  return [...placed, ...rows.filter((r) => !placed.includes(r))];
}

function LookupDialog({ kind, row, onClose, categories = [], initialParent }: { kind: LookupKind; row: LookupRow | null; onClose: () => void; categories?: LookupRow[]; initialParent?: number }) {
  const config = LOOKUPS[kind];
  const isCategory = kind === "categories";
  // Two levels: a parent must be top-level, and a category with sub-categories stays top-level.
  const hasChildren = Boolean(row && categories.some((c) => c.parent_id === row.id));
  const parentChoices = categories.filter((c) => c.parent_id == null && c.id !== row?.id);
  const [parentId, setParentId] = useState(row ? row.parent_id == null ? "" : String(row.parent_id) : String(initialParent ?? ""));
  const [uploading, setUploading] = useState(false);
  const [sortOrder, setSortOrder] = useState(String(row?.sort_order ?? 0));
  const [icon, setIcon] = useState(row?.icon ? String(row.icon) : "");
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(config.fields.map((f) => [f.name, String(row?.[f.name] ?? "")])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const alertRef = useRef<HTMLDivElement>(null);

  const save = useMutation({
    mutationFn: (input: Record<string, string | number | null>) =>
      row ? staffApi.updateLookup(kind, row.id, input as never) : staffApi.createLookup(kind, input as never),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(row ? `${config.singular} saved` : `${config.singular} added`);
      onClose();
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      const next: Record<string, string> = {};
      for (const name of [...config.fields.map((f) => f.name), "parent_id", "sort_order", "icon"]) {
        const m = apiError.field(name);
        if (m) next[name] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
      if (next.form) requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (uploading) return;
    const found: Record<string, string> = {};
    for (const f of config.fields) {
      const v = values[f.name].trim();
      if (f.required && !v) found[f.name] = `Enter the ${f.label.toLowerCase()}.`;
      else if (v.length > f.max) found[f.name] = `Keep it under ${f.max.toLocaleString()} characters.`;
      else if (f.url && v && !/^https?:\/\/\S+$/.test(v)) found[f.name] = "Enter a full web address starting with https://.";
      else if (f.slug && v && !/^[A-Za-z0-9_-]+$/.test(v)) found[f.name] = "Use letters, numbers, dashes and underscores only.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    if (isCategory && !/^\d{1,5}$/.test(sortOrder.trim())) {
      setErrors({ sort_order: "Enter a whole number, e.g. 10." });
      return;
    }
    const input: Record<string, string | number | null> = {};
    const isTopLevelCategory = isCategory && !parentId;
    if (isCategory) {
      input.parent_id = parentId ? Number(parentId) : null;
      input.sort_order = Number(sortOrder.trim());
      input.icon = isTopLevelCategory && icon.trim() ? icon.trim() : null;
    }
    for (const f of config.fields) {
      const v = values[f.name].trim();
      // Optional fields send null to clear them; an empty slug is left out so the API makes one.
      if (f.slug && !v) continue;
      input[f.name] = v || (f.required ? v : null);
    }
    save.mutate(input);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && !uploading && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{row ? `Edit ${config.singular.toLowerCase()}` : `Add ${config.singular.toLowerCase()}`}</DialogTitle>
            <DialogDescription>{isCategory ? "Organise the shop into parent shelves and their sub-categories. Names, placement and menu order stay together." : kind === "authors" ? "Introduce the author with a portrait, their name and a short biography." : config.lead}</DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert ref={alertRef} title={errors.form} /> : null}
          {(kind === "authors" ? [...config.fields.filter((f) => f.name === "photo_url"), ...config.fields.filter((f) => f.name !== "photo_url")] : config.fields).map((f) =>
            kind === "authors" && f.name === "photo_url" ? <ImageUploadField key={f.name} label="Author photo" optional value={values.photo_url} onChange={(url) => setValues((v) => ({ ...v, photo_url: url }))} error={errors.photo_url} onUploadingChange={setUploading} /> : f.long ? (
              <TextAreaField key={f.name} label={f.label} optional={!f.required} hint={f.hint} rows={4} maxLength={f.max} value={values[f.name]} error={errors[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
            ) : (
              <TextField
                key={f.name}
                label={f.label}
                optional={!f.required}
                hint={f.hint}
                type={f.url ? "url" : "text"}
                maxLength={f.max}
                value={values[f.name]}
                error={errors[f.name]}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            ),
          )}
          {isCategory ? (
            <>
              <div className="catalogue-category-preview"><FolderTree aria-hidden="true" className="size-5" /><span><strong>{parentId ? parentChoices.find((c) => String(c.id) === parentId)?.name : "Parent category"}</strong>{parentId ? <span className="block text-sm"><ArrowDownRight className="mr-1 inline size-4" aria-hidden="true" />{values.name || "New sub-category"}</span> : <span className="block text-sm text-muted-foreground">{hasChildren ? "Existing sub-categories remain under this shelf." : "A main shelf in the shop menu."}</span>}</span></div>
              <div className="grid gap-1.5">
                <label htmlFor="category-parent" className="text-sm font-semibold">
                  Parent category <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <select
                  id="category-parent"
                  value={parentId}
                  disabled={hasChildren}
                  onChange={(e) => setParentId(e.target.value)}
                  aria-describedby="category-parent-hint"
                  aria-invalid={errors.parent_id ? true : undefined}
                  className="h-11 rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <option value="">None (top-level)</option>
                  {parentChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p id="category-parent-hint" className="text-sm text-muted-foreground">
                  {hasChildren ? "This category has sub-categories, so it stays top-level." : "Choose a parent to make this a sub-category (e.g. Fantasy under Fiction)."}
                </p>
                {errors.parent_id ? <p className="text-sm font-medium text-destructive">{errors.parent_id}</p> : null}
              </div>
              {!parentId ? (
                <div className="grid gap-2">
                  <span id="category-icon-label" className="text-sm font-semibold">
                    Icon <span className="font-normal text-muted-foreground">(optional, top-level only)</span>
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="category-icon-label"
                    onKeyDown={(event) => {
                      if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                      event.preventDefault();
                      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
                      const index = buttons.indexOf(event.target as HTMLButtonElement);
                      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length;
                      buttons[next]?.focus(); buttons[next]?.click();
                    }}
                    className="catalogue-icon-picker grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-1.5 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface-2/40"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!icon}
                      tabIndex={!icon ? 0 : -1}
                      aria-label="No icon"
                      onClick={() => setIcon("")}
                      className={cn(
                        "flex min-h-[44px] items-center justify-center rounded-lg border text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                        !icon
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      No icon
                    </button>
                    {CATEGORY_ICON_OPTIONS.map(({ name, label, Icon }) => {
                      const selected = icon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          tabIndex={selected ? 0 : -1}
                          aria-label={label}
                          title={label}
                          onClick={() => setIcon(name)}
                          className={cn(
                            "flex min-h-[44px] items-center justify-center rounded-lg border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                            selected
                              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                              : "border-border bg-card text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                          )}
                        >
                          <Icon className="size-5 shrink-0" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <TextField
                label="Order"
                hint="Smaller numbers come first in the shop menu."
                inputMode="numeric"
                value={sortOrder}
                error={errors.sort_order}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending || uploading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending} disabled={uploading}>
              {row ? "Save" : `Add ${config.singular.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/*
 * /admin/authors, /admin/categories, /admin/publishers, /admin/series: one screen
 * per lookup, listed from the catalogue API (book counts are books on sale).
 * Add and edit in a dialog; admins can delete one that no book uses (the API
 * refuses otherwise and says why).
 */
export default function LookupPage({ kind }: { kind: LookupKind }) {
  const config = LOOKUPS[kind];
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const [editing, setEditing] = useState<LookupRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<LookupRow | null>(null);
  const [managingVolumes, setManagingVolumes] = useState<LookupRow | null>(null);
  const [newParent, setNewParent] = useState<number>();

  const list = useQuery({
    queryKey: ["catalog", "admin-lookup", kind, q, page],
    queryFn: async () => {
      if (kind === "categories") {
        const all = (await catalogApi.categories()) as LookupRow[];
        return { rows: all, meta: null };
      }
      const res =
        kind === "authors"
          ? await catalogApi.authors({ q: q || undefined, page, per_page: PER_PAGE })
          : kind === "publishers"
            ? await catalogApi.publishers({ q: q || undefined, page, per_page: PER_PAGE })
            : await catalogApi.seriesList({ page, per_page: PER_PAGE });
      return { rows: res.data as LookupRow[], meta: res.meta };
    },
    placeholderData: (previous) => previous,
  });

  const meta = list.data?.meta;
  const rows = kind === "categories" ? asTree(list.data?.rows ?? []) : (list.data?.rows ?? []);
  const parentFilter = params.get("parent") ?? "";
  const visibleRows = kind !== "categories" ? rows : rows.filter((row) => {
    const parent = row.parent_id == null ? row : rows.find((item) => item.id === row.parent_id);
    const groupMatches = !parentFilter || String(parent?.id) === parentFilter;
    const term = q.trim().toLocaleLowerCase();
    const nameMatches = !term || row.name.toLocaleLowerCase().includes(term) || parent?.name.toLocaleLowerCase().includes(term) || (row.parent_id == null && rows.some((child) => child.parent_id === row.id && child.name.toLocaleLowerCase().includes(term)));
    return groupMatches && nameMatches;
  });
  const search = (event: FormEvent) => {
    event.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true });
  };
  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    return `?${next.toString()}`;
  };

  return (
    <AdminPage
      title={config.title}
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? config.singular.toLowerCase() : config.title.toLowerCase()) : config.lead}
      actions={
        <Button onClick={() => { setNewParent(undefined); setEditing("new"); }}>
          <Plus aria-hidden="true" /> Add {config.singular.toLowerCase()}
        </Button>
      }
    >
      {kind === "categories" ? <><div className="work-toolbar"><SearchBox label="Search categories" value={q} placeholder="Find a parent or sub-category" onSearch={(value) => { const next = new URLSearchParams(params); if (value) next.set("q", value); else next.delete("q"); setParams(next); }} /><FilterSelect label="Parent shelf" value={parentFilter} options={[{ value: "", label: "All parent shelves" }, ...rows.filter((row) => row.parent_id == null).map((row) => ({ value: String(row.id), label: row.name }))]} onChange={(value) => { const next = new URLSearchParams(params); if (value) next.set("parent", value); else next.delete("parent"); setParams(next); }} /></div><p className="text-sm text-muted-foreground">Parent shelves: {rows.filter((row) => row.parent_id == null).length} · Sub-categories: {rows.filter((row) => row.parent_id != null).length}. Add sub-categories from their parent shelf; edit a category to change its placement.</p></> : null}
      {config.searchable ? (
        <form onSubmit={search} role="search" className="relative max-w-md">
          <label htmlFor="lookup-search" className="sr-only">
            Search {config.title.toLowerCase()} by name
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="lookup-search"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by name"
            className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      ) : null}

      {list.isError && !list.data ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : list.isPending ? (
        <SkeletonGroup label={`Loading ${config.title.toLowerCase()}…`} className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </SkeletonGroup>
      ) : visibleRows.length === 0 ? (
        <EmptyState
          icon={config.Icon}
          title={q ? `No ${config.title.toLowerCase()} match "${q}"` : `No ${config.title.toLowerCase()} yet`}
          description={q ? "Check the spelling or search for part of the name." : `Add one to use it on books.`}
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <div className={cn("catalogue-lookups desk-card rounded-xl border border-border bg-card", list.isPlaceholderData && "opacity-60 transition-opacity")} data-kind={kind}>
          <table className="w-full text-left text-[15px]">
            <thead className="border-b border-border bg-surface-2 text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                {config.detail ? <th scope="col" className="px-4 py-3 font-semibold">{config.detail.label}</th> : null}
                <th scope="col" className="px-4 py-3 text-right font-semibold">Books on sale</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={cn("catalogue-lookup-name px-4 py-2.5", row.parent_id == null ? "font-semibold" : "catalogue-subcategory font-normal")}>
                    {kind === "authors" ? <span className="catalogue-author-name">{row.photo_url ? <img src={String(row.photo_url)} alt="" className="catalogue-author-photo" loading="lazy" /> : <span className="catalogue-author-photo grid place-items-center bg-secondary text-muted-foreground"><UserRound className="size-5" aria-hidden="true" /></span>}<span>{row.name}</span></span> : row.parent_id == null ? (
                      <span className="inline-flex items-center gap-2">
                        <CategoryIcon name={row.icon as string | null} className="size-4 shrink-0 text-muted-foreground" />
                        <span>{row.name}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2"><ArrowDownRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        <span className="sr-only">Sub-category: </span>
                        {row.name}
                      </span>
                    )}
                  </th>
                  {config.detail ? <td data-label={config.detail.label} className="catalogue-lookup-description px-4 py-2.5 text-muted-foreground"><span>{String(row[config.detail.field] ?? "") || "—"}</span>{kind === "categories" ? <small className="block mt-1">{row.parent_id == null ? `Sub-categories: ${rows.filter((c) => c.parent_id === row.id).length} · Parent shelf` : `Under ${rows.find((c) => c.id === row.parent_id)?.name ?? "unavailable parent"}`}</small> : null}</td> : null}
                  <td data-label="Books on sale" className="catalogue-lookup-count px-4 py-2.5 text-right tabular-nums">{row.books_count ?? 0}</td>
                  <td className="catalogue-lookup-actions px-4 py-2.5">
                    <div className="catalogue-actions">
                      {kind === "categories" && row.parent_id == null ? <Button size="sm" variant="outline" aria-label={`Add sub-category under ${row.name}`} onClick={() => { setNewParent(row.id); setEditing("new"); }}><Plus aria-hidden="true" />Sub-category</Button> : null}
                      {kind === "series" ? (
                        <Button size="icon" variant="ghost" aria-label={`Manage volumes for ${row.name}`} onClick={() => setManagingVolumes(row)}>
                          <ListOrdered aria-hidden="true" />
                        </Button>
                      ) : null}
                      <Button size="icon" variant="ghost" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      {isAdmin ? (
                        <Button size="icon" variant="ghost" aria-label={`Delete ${row.name}`} onClick={() => setDeleting(row)}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta ? <Pagination page={meta.current_page ?? 1} lastPage={meta.last_page ?? 1} hrefFor={hrefFor} /> : null}

      {managingVolumes ? <SeriesVolumesDialog seriesId={managingVolumes.id} seriesName={managingVolumes.name} onClose={() => setManagingVolumes(null)} /> : null}
      {editing ? <LookupDialog key={editing === "new" ? `new-${newParent ?? "root"}` : editing.id} kind={kind} row={editing === "new" ? null : editing} initialParent={newParent} categories={kind === "categories" ? rows : []} onClose={() => setEditing(null)} /> : null}
      <StrictDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Strict delete "${deleting?.name ?? ""}"`}
        itemName={deleting?.name ?? ""}
        entityLabel={config.singular.toLowerCase()}
        description={`Moves this ${config.singular.toLowerCase()} to the Trash for 30 days. Only ${config.title.toLowerCase()} that no book uses can be deleted.`}
        onConfirm={(payload) => (deleting ? staffApi.deleteLookup(kind, deleting.id, payload) : Promise.resolve())}
        onSuccess={() => {
          if (deleting) {
            toast.success(`"${deleting.name}" moved to trash`);
            void queryClient.invalidateQueries({ queryKey: ["catalog"] });
            void queryClient.invalidateQueries({ queryKey: ["staff", "trash"] });
            setDeleting(null);
          }
        }}
      />
    </AdminPage>
  );
}
