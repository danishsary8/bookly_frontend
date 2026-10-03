import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { staffApi, staffKeys, staffQueries, type StaffBook, type StaffVariant } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { CoverThumb } from "@/components/CoverThumb";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { AuthorPicker } from "@/features/admin/books/AuthorPicker";
import { bookDefaults, bookSchema, toBookInput, type BookValues } from "@/features/admin/books/bookSchema";
import { BookState } from "@/features/admin/books/BookState";
import { VariantDialog } from "@/features/admin/books/VariantDialog";
import { useStaff } from "@/features/admin/staffSession";
import { formatLabel, LANGUAGES } from "@/lib/catalog";
import { applyApiErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const back = (
  <Link to="/admin/books" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
    <ArrowLeft className="size-4" aria-hidden="true" /> All books
  </Link>
);

function Panel({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="font-sans text-[1.0625rem] font-semibold tracking-normal">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Title, authors, categories, publisher, series, language, pages, date and description. */
function DetailsForm({ book }: { book: StaffBook | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<number, string>>(() => Object.fromEntries((book?.authors ?? []).map((a) => [a.id, a.name])));
  const categories = useQuery(catalogQueries.categories());
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const series = useQuery(catalogQueries.seriesList({ per_page: 100 }));
  const { register, handleSubmit, control, reset, setError, formState } = useForm<BookValues>({ resolver: zodResolver(bookSchema), defaultValues: bookDefaults(book) });
  const { errors, isSubmitting, isDirty } = formState;
  const seriesId = useWatch({ control, name: "series_id" });
  const language = useWatch({ control, name: "language" });

  const submit = async (values: BookValues) => {
    setFormError(null);
    try {
      const saved = book ? await staffApi.updateBook(book.id, toBookInput(values)) : await staffApi.createBook(toBookInput(values));
      queryClient.setQueryData(staffKeys.book(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      if (book) {
        reset(bookDefaults(saved));
        toast.success("Book saved");
      } else {
        toast.success({ title: "Book created", description: "Add a format with a price so it can go on sale." });
        navigate(`/admin/books/${saved.id}`, { replace: true });
      }
    } catch (error) {
      const message = applyApiErrors(error, setError, ["title", "author_ids", "category_ids", "publisher_id", "series_id", "series_order", "language", "page_count", "publish_date", "description"]);
      if (message) setFormError(message);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid content-start gap-5 rounded-xl border border-border bg-card p-5">
      <h2 className="font-sans text-[1.0625rem] font-semibold tracking-normal">Details</h2>
      {formError ? <FormAlert title={formError} /> : null}
      <TextField label="Title" error={errors.title?.message} {...register("title")} />
      <Controller
        control={control}
        name="author_ids"
        render={({ field, fieldState }) => (
          <AuthorPicker
            value={field.value}
            names={names}
            error={fieldState.error?.message}
            onChange={(ids, picked) => {
              if (picked) setNames((n) => ({ ...n, [picked.id]: picked.name }));
              field.onChange(ids);
            }}
          />
        )}
      />
      <Controller
        control={control}
        name="category_ids"
        render={({ field }) => (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[15px] font-semibold">Categories</legend>
            {categories.isPending ? (
              <Skeleton className="h-11" />
            ) : (
              <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                {(categories.data ?? []).map((c) => {
                  const checked = field.value.includes(c.id!);
                  return (
                    <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                      <Checkbox checked={checked} onCheckedChange={(on) => field.onChange(on ? [...field.value, c.id!] : field.value.filter((v) => v !== c.id))} />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Publisher" optional error={errors.publisher_id?.message} {...register("publisher_id")}>
          <option value="">None</option>
          {(publishers.data?.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Language" error={errors.language?.message} {...register("language")}>
          {[...new Set([...LANGUAGES, language].filter(Boolean))].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </SelectField>
        <SelectField label="Series" optional error={errors.series_id?.message} {...register("series_id")}>
          <option value="">Not part of a series</option>
          {(series.data?.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Number in the series" optional inputMode="numeric" disabled={!seriesId} error={errors.series_order?.message} {...register("series_order")} />
        <TextField label="Pages" optional inputMode="numeric" error={errors.page_count?.message} {...register("page_count")} />
        <TextField label="Published" optional type="date" error={errors.publish_date?.message} {...register("publish_date")} />
      </div>
      <TextAreaField label="Description" optional rows={6} error={errors.description?.message} {...register("description")} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting} disabled={book ? !isDirty : false}>
          {book ? "Save changes" : "Create book"}
        </Button>
        {book && isDirty ? (
          <Button type="button" variant="ghost" onClick={() => reset(bookDefaults(book))}>
            Discard changes
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** The book's formats with price, stock and on-sale state; add, edit and (admins, never-ordered only) delete. */
function Formats({ book, isAdmin }: { book: StaffBook; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<StaffVariant | null | "new">(null);
  const [deleting, setDeleting] = useState<StaffVariant | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: staffKeys.book(book.id) });
    void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };
  const remove = useMutation({
    mutationFn: (v: StaffVariant) => staffApi.deleteVariant(v.id),
    onSuccess: () => {
      toast.success("Format deleted");
      refresh();
    },
    onError: (error) => toast.error({ title: "Couldn't delete the format", description: ApiError.from(error).message }),
    onSettled: () => setDeleting(null),
  });
  const used = book.variants.map((v) => v.format).filter((f): f is NonNullable<typeof f> => Boolean(f));

  return (
    <Panel
      id="book-formats"
      title="Formats and stock"
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing("new")} disabled={used.length >= 4 || Boolean(book.deleted_at)}>
          <Plus aria-hidden="true" /> Add format
        </Button>
      }
    >
      {book.variants.length === 0 ? (
        <p className="flex gap-2 rounded-md bg-warning-tint p-3 text-[15px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          No formats yet: the book stays hidden from the shop until it has one on sale.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {book.variants.map((v) => {
            const digital = v.format === "ebook" || v.format === "audiobook";
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                <CoverThumb src={v.cover_image_url} className="w-9 shrink-0" />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {formatLabel(v.format)} · <span className="tabular-nums">{formatUsd(v.price_usd)}</span>
                    {v.is_active ? null : (
                      <Badge tone="neutral" shape="outline">
                        Not on sale
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {v.sku}
                    {v.isbn ? ` · ISBN ${v.isbn}` : ""}
                  </p>
                  {digital ? null : (
                    <p className={cn("text-sm tabular-nums", v.is_low_stock ? "font-semibold text-warning" : "text-muted-foreground")}>
                      {v.is_low_stock ? <AlertTriangle className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" /> : null}
                      {v.stock_quantity} in stock · alert at {v.low_stock_threshold}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${formatLabel(v.format)}`} onClick={() => setEditing(v)}>
                    <Pencil aria-hidden="true" />
                  </Button>
                  {isAdmin ? (
                    <Button size="icon" variant="ghost" aria-label={`Delete ${formatLabel(v.format)}`} onClick={() => setDeleting(v)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <VariantDialog
          key={editing === "new" ? "new" : editing.id}
          bookId={book.id}
          variant={editing === "new" ? null : editing}
          usedFormats={used}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={(saved) => {
            toast.success(editing === "new" ? `${formatLabel(saved.format)} added` : `${formatLabel(saved.format)} saved`);
            refresh();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete the ${formatLabel(deleting?.format).toLowerCase()}?`}
        description="Only formats that were never ordered can be deleted. For one that has sold, turn off On sale instead."
        confirmLabel="Delete format"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </Panel>
  );
}

/** Admins: soft delete (the book leaves the shop, past orders keep it) and restore. */
function DangerZone({ book }: { book: StaffBook }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const done = (saved?: StaffBook) => {
    if (saved) queryClient.setQueryData(staffKeys.book(book.id), saved);
    else void queryClient.invalidateQueries({ queryKey: staffKeys.book(book.id) });
    void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };
  const remove = useMutation({
    mutationFn: () => staffApi.deleteBook(book.id),
    onSuccess: () => {
      toast.success({ title: `"${book.title}" deleted`, description: "It's in Deleted books if you need it back." });
      done();
    },
    onError: (error) => toast.error({ title: "Couldn't delete the book", description: ApiError.from(error).message }),
    onSettled: () => setConfirm(false),
  });
  const restore = useMutation({
    mutationFn: () => staffApi.restoreBook(book.id),
    onSuccess: (saved) => {
      toast.success(`"${book.title}" restored`);
      done(saved);
    },
    onError: (error) => toast.error({ title: "Couldn't restore the book", description: ApiError.from(error).message }),
  });

  return (
    <Panel id="book-danger" title={book.deleted_at ? "Deleted book" : "Delete"}>
      {book.deleted_at ? (
        <>
          <p className="text-[15px] text-muted-foreground">This book is hidden from the shop and the book list. Restore it to edit and sell it again.</p>
          <Button variant="outline" onClick={() => restore.mutate()} loading={restore.isPending} className="w-fit">
            <RotateCcw aria-hidden="true" /> Restore book
          </Button>
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted-foreground">Removes the book from the shop. Past orders keep it, and you can restore it later.</p>
          <Button variant="outline" onClick={() => setConfirm(true)} className="w-fit border-destructive/50 text-destructive hover:bg-destructive-tint">
            <Trash2 aria-hidden="true" /> Delete book
          </Button>
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete "${book.title}"?`}
        description="It disappears from the shop straight away. Past orders keep it, and an admin can restore it from Deleted books."
        confirmLabel="Delete book"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Panel>
  );
}

/* /admin/books/new and /admin/books/:id. */
export default function BookEditPage() {
  const params = useParams();
  const isNew = params.id === undefined;
  const id = Number(params.id);
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const book = useQuery({ ...staffQueries.book(id), enabled: !isNew && Number.isInteger(id) && id > 0 });

  if (isNew) {
    return (
      <AdminPage title="New book" lead="Start with the details; you'll add formats, prices and stock next." back={back}>
        <div className="max-w-3xl">
          <DetailsForm book={null} />
        </div>
      </AdminPage>
    );
  }
  if (!Number.isInteger(id) || id <= 0 || (book.isError && ApiError.from(book.error).kind === "not_found")) {
    return <NotFoundState what="book" backTo="/admin/books" backLabel="All books" />;
  }
  if (book.isError) return <ErrorState error={book.error} onRetry={() => book.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!book.data) {
    return (
      <SkeletonGroup label="Loading book…" className="mx-auto grid w-full max-w-[1200px] gap-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 rounded-xl" />
      </SkeletonGroup>
    );
  }

  const b = book.data;
  return (
    <AdminPage
      title={b.title}
      lead={
        <span className="flex flex-wrap items-center gap-2">
          <BookState book={b} /> {b.authors.map((a) => a.name).join(", ")}
        </span>
      }
      back={back}
      actions={
        b.is_visible && !b.deleted_at ? (
          <Link to={`/books/${b.id}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink aria-hidden="true" /> View in shop
          </Link>
        ) : null
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <DetailsForm key={b.updated_at} book={b} />
        <div className="grid content-start gap-6">
          <Formats book={b} isAdmin={isAdmin} />
          {isAdmin ? <DangerZone book={b} /> : null}
        </div>
      </div>
    </AdminPage>
  );
}
