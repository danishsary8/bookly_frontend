import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import {
  staffApi,
  staffKeys,
  staffQueries,
  type StaffBook,
  type StaffVariant,
} from "@/api/endpoints/staff";
import { BookSalesPanel } from "@/features/admin/books/BookSalesPanel";
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
import { Panel } from "@/features/admin/reportKit";
import { AdminPage } from "@/features/admin/AdminPage";
import { StrictDeleteDialog } from "@/features/admin/StrictDeleteDialog";
import { AuthorPicker } from "@/features/admin/books/AuthorPicker";
import {
  bookDefaults,
  bookSchema,
  toBookInput,
  type BookValues,
} from "@/features/admin/books/bookSchema";
import { BookState } from "@/features/admin/books/BookState";
import { VariantDialog } from "@/features/admin/books/VariantDialog";
import { BookCoverPanel } from "@/features/admin/books/BookCoverPanel";
import { EbookPanel } from "@/features/admin/books/EbookPanel";
import { usePauseAutoRefresh } from "@/features/admin/autoRefresh";
import { mainCover, pendingCover } from "@/features/admin/books/pendingCover";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { StockHistoryDrawer } from "@/features/admin/stock/StockHistoryDrawer";
import { useStaff } from "@/features/admin/staffSession";
import { FormSection } from "@/features/admin/books/FormSection";
import { PricingFields } from "@/features/admin/books/PricingFields";
import { MONEY, profitOf, suggestSku } from "@/features/admin/books/pricing";
import { useT } from "@/i18n";
import { FORMATS } from "@/lib/catalog";
import { formatLabel, GRADES, LANGUAGES, LEVELS } from "@/lib/catalog";
import type { BookFormat } from "@/api/types";
import { applyApiErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const back = (
  <Link
    to="/admin/books"
    className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
  >
    <ArrowLeft className="size-4" aria-hidden="true" /> All books
  </Link>
);

/** Title, authors, categories, publisher, series, language, pages, date and description. */
function DetailsForm({ book }: { book: StaffBook | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const staffSession = useStaff();
  const isAdmin = staffSession?.user?.role === "admin";
  const [formError, setFormError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<number, string>>(() =>
    Object.fromEntries((book?.authors ?? []).map((a) => [a.id, a.name])),
  );
  const categories = useQuery(catalogQueries.categories());
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const series = useQuery(catalogQueries.seriesList({ per_page: 100 }));
  const { register, handleSubmit, control, reset, setError, formState } =
    useForm<BookValues>({
      resolver: zodResolver(bookSchema),
      defaultValues: bookDefaults(book),
    });
  const { errors, isSubmitting, isDirty } = formState;
  const seriesId = useWatch({ control, name: "series_id" });
  const language = useWatch({ control, name: "language" });
  const statusWatch = useWatch({ control, name: "status" });

  const { dict } = useT();
  const t = dict.bookForm;
  const titleWatch = useWatch({ control, name: "title" });

  // New book only: a cover chosen now goes to the first format (owner 2026-11-02).
  const [newCover, setNewCover] = useState("");
  // New book only: the first format, price and stock on the same page, so the book can go on sale in one step.
  const [withFormat, setWithFormat] = useState(true);
  const [first, setFirst] = useState({ format: "paperback", sku: "", price: "", cost: "", stock: "0" });
  const [skuTouched, setSkuTouched] = useState(false);
  const [firstErrors, setFirstErrors] = useState<Partial<Record<"sku" | "price" | "cost" | "stock", string>>>({});
  const firstSku = skuTouched ? first.sku : titleWatch.trim() ? suggestSku(titleWatch, first.format) : "";
  const firstDigital = first.format === "ebook" || first.format === "audiobook";
  const checkFirst = () => {
    const e: typeof firstErrors = {};
    if (!firstSku.trim()) e.sku = "Enter a SKU.";
    if (!MONEY.test(first.price.trim())) e.price = "Enter a price in dollars, like 12.99.";
    if (first.cost.trim() && !MONEY.test(first.cost.trim())) e.cost = "Enter a cost in dollars, like 8.50.";
    if (!firstDigital && !/^\d+$/.test(first.stock.trim())) e.stock = "Enter a whole number, 0 or more.";
    setFirstErrors(e);
    return Object.keys(e).length === 0;
  };
  // Unsaved changes: don't let the auto refresh reload this form.
  usePauseAutoRefresh(isDirty || Boolean(newCover));

  const submit = async (values: BookValues) => {
    setFormError(null);
    if (!book && withFormat && !checkFirst()) return;
    try {
      const payload = toBookInput(values, isAdmin);
      const saved = book
        ? await staffApi.updateBook(book.id, payload)
        : await staffApi.createBook(payload);
      queryClient.setQueryData(staffKeys.book(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      if (book) {
        reset(bookDefaults(saved));
        toast.success("Book saved");
      } else {
        let formatSaved = false;
        if (withFormat) {
          try {
            await staffApi.createVariant(saved.id, {
              format: first.format as BookFormat,
              sku: firstSku.trim(),
              price_usd: first.price.trim(),
              ...(isAdmin ? { cost_price_usd: first.cost.trim() || null } : {}),
              ...(firstDigital ? {} : { stock_quantity: Number(first.stock) }),
              cover_image_url: newCover || null,
              is_active: true,
            });
            formatSaved = true;
          } catch (error) {
            toast.error({ title: t.formatFailed, description: ApiError.from(error).message });
          }
        }
        if (formatSaved) {
          toast.success("Book created");
        } else {
          if (!withFormat) toast.success({ title: "Book created", description: "Add a format with a price so it can go on sale." });
          pendingCover.set(saved.id, newCover);
        }
        void queryClient.invalidateQueries({ queryKey: staffKeys.book(saved.id) });
        navigate(`/admin/books/${saved.id}`, { replace: true, state: formatSaved ? null : { addFormat: true, cover: newCover } });
      }
    } catch (error) {
      const message = applyApiErrors(error, setError, [
        "title",
        "status",
        "publish_at",
        "author_ids",
        "category_ids",
        "publisher_id",
        "series_id",
        "series_order",
        "language",
        "page_count",
        "age_min",
        "age_max",
        "school_grade",
        "reader_rating",
        "reader_rating_source",
        "level",
        "publish_date",
        "description",
      ]);
      if (message) setFormError(message);
    }
  };

  const publishing = isAdmin ? (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="Book Status" className="inline-flex flex-wrap gap-2">
        {(["draft", "scheduled", "live"] as const).map((s) => (
          <label
            key={s}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
              statusWatch === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-surface-2",
            )}
          >
            <input type="radio" value={s} {...register("status")} className="sr-only" />
            <span className="capitalize">{s}</span>
          </label>
        ))}
      </div>
      {statusWatch === "scheduled" ? (
        <TextField
          label="Goes live at"
          hint="Cambodia time. The book appears in the shop by itself at this time."
          type="datetime-local"
          error={errors.publish_at?.message}
          {...register("publish_at")}
        />
      ) : null}
    </div>
  ) : (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Status:</span>
        {book ? <BookState book={book} /> : <span className="font-medium text-muted-foreground">Draft (default)</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">An admin publishes this book.</p>
    </div>
  );

  return (
    <form
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
      className="book-form grid content-start gap-6 desk-card rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="font-sans text-[1.0625rem] font-semibold tracking-normal">Details</h2>
      {formError ? <FormAlert title={formError} /> : null}

      <FormSection id="book-basics" title={t.basics} hint={t.basicsHint}>
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
        {book ? null : (
          <ImageUploadField
            label="Cover"
            optional
            value={newCover}
            onChange={setNewCover}
            hint="Used by the first format (and any format without its own cover). JPEG, PNG or WebP up to 5 MB."
          />
        )}
        <Controller
          control={control}
          name="category_ids"
          render={({ field }) => (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Categories</legend>
              {categories.isPending ? (
                <Skeleton className="h-11" />
              ) : (
                <div className="grid gap-x-4 rounded-md border border-border bg-surface-2/40 px-3 py-1 sm:grid-cols-2 lg:grid-cols-3">
                  {(categories.data ?? []).map((c) => {
                    const checked = field.value.includes(c.id!);
                    return (
                      <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(on) =>
                            field.onChange(on ? [...field.value, c.id!] : field.value.filter((v) => v !== c.id))
                          }
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}
        />
      </FormSection>

      {book ? null : (
        <FormSection id="book-first-format" title={t.firstFormat} hint={withFormat ? t.firstFormatHint : undefined}>
          {withFormat ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label={t.format}
                  value={first.format}
                  onChange={(e) => setFirst((f) => ({ ...f, format: e.target.value }))}
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label={t.sku}
                  value={firstSku}
                  onChange={(e) => {
                    setSkuTouched(true);
                    setFirst((f) => ({ ...f, sku: e.target.value }));
                  }}
                  error={firstErrors.sku}
                  hint={t.skuHint}
                  autoComplete="off"
                />
              </div>
              <PricingFields
                price={first.price}
                cost={first.cost}
                onPrice={(v) => setFirst((f) => ({ ...f, price: v }))}
                onCost={(v) => setFirst((f) => ({ ...f, cost: v }))}
                priceError={firstErrors.price}
                costError={firstErrors.cost}
                showCost={isAdmin}
              />
              {firstDigital ? null : (
                <TextField
                  label={t.stock}
                  inputMode="numeric"
                  containerClassName="sm:max-w-[calc(50%-0.5rem)]"
                  value={first.stock}
                  onChange={(e) => setFirst((f) => ({ ...f, stock: e.target.value }))}
                  error={firstErrors.stock}
                />
              )}
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setWithFormat((on) => !on)}
            className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {withFormat ? t.skipFormat : t.addFormatNow}
          </button>
        </FormSection>
      )}

      <FormSection id="book-info" title={t.info} hint={t.infoHint}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <TextField
            label="Number in the series"
            optional
            inputMode="numeric"
            disabled={!seriesId}
            error={errors.series_order?.message}
            {...register("series_order")}
          />
          <TextField label="Pages" optional inputMode="numeric" error={errors.page_count?.message} {...register("page_count")} />
          <TextField label="Published" optional type="date" error={errors.publish_date?.message} {...register("publish_date")} />
        </div>
      </FormSection>

      <FormSection id="book-readers" title={t.readers} hint={t.readersHint}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Reader age from" optional inputMode="numeric" error={errors.age_min?.message} {...register("age_min")} />
          <TextField label="Reader age to" optional inputMode="numeric" error={errors.age_max?.message} {...register("age_max")} />
          <SelectField label="School grade" optional hint="For Khmer school books." error={errors.school_grade?.message} {...register("school_grade")}>
            <option value="">Not a school book</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </SelectField>
          <SelectField label="English level" optional hint="For English learning books." error={errors.level?.message} {...register("level")}>
            <option value="">No level</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Reader rating"
            optional
            inputMode="decimal"
            placeholder="4.3"
            hint="A public score from 1.0 to 5.0. Shown with its source until customers review the book."
            error={errors.reader_rating?.message}
            {...register("reader_rating")}
          />
          <TextField
            label="Rating source"
            optional
            placeholder="Goodreads"
            hint="Where the score comes from."
            error={errors.reader_rating_source?.message}
            {...register("reader_rating_source")}
          />
        </div>
      </FormSection>

      <FormSection id="book-about" title={t.about}>
        <TextAreaField label="Description" optional rows={6} error={errors.description?.message} {...register("description")} />
      </FormSection>

      <FormSection id="book-publishing" title={t.publishing} hint={t.publishingHint}>
        {publishing}
      </FormSection>

      <div className="admin-form-actions flex flex-wrap items-center gap-3">
        <p className="mr-auto flex items-center gap-2 text-sm font-medium text-muted-foreground" aria-live="polite">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", book && !isDirty ? "bg-success" : "bg-warning")}
          />
          {book && !isDirty ? t.allSaved : t.unsaved}
        </p>
        {book && isDirty ? (
          <Button type="button" variant="ghost" onClick={() => reset(bookDefaults(book))}>
            Discard changes
          </Button>
        ) : null}
        <Button type="submit" loading={isSubmitting} disabled={book ? !isDirty : false}>
          {book ? "Save changes" : "Create book"}
        </Button>
      </div>
    </form>
  );
}

/** Admins: the format's supplier cost and profit per copy, one quiet line under the SKU. */
function FormatProfit({ price, cost }: { price: string; cost: string }) {
  const { dict } = useT();
  const t = dict.bookForm;
  const result = profitOf(price, cost);
  return (
    <p className="text-sm tabular-nums text-muted-foreground">
      {t.costShort.replace("{v}", formatUsd(cost))}
      {result.kind === "none" ? null : (
        <span className={cn("font-semibold", result.kind === "loss" ? "text-destructive" : "text-success")}>
          {" · "}
          {result.kind === "profit"
            ? `${t.profit.replace("{v}", formatUsd(result.amount))} (${t.margin.replace("{p}", `${Math.round(result.margin * 1000) / 10}%`)})`
            : t.loss.replace("{v}", formatUsd(-result.amount))}
        </span>
      )}
    </p>
  );
}

/** The book's formats with price, stock and on-sale state; add, edit and (admins, never-ordered only) delete. */
function Formats({ book, isAdmin }: { book: StaffBook; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const justCreated = (location.state as { addFormat?: boolean; cover?: string } | null) ?? null;
  // Just created: open "Add format" at once (price and stock make the book sellable).
  const [editing, setEditing] = useState<StaffVariant | null | "new">(() => (justCreated?.addFormat && book.variants.length === 0 ? "new" : null));
  const [deleting, setDeleting] = useState<StaffVariant | null>(null);
  const [historyVariant, setHistoryVariant] = useState<StaffVariant | null>(
    null,
  );
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
    onError: (error) =>
      toast.error({
        title: "Couldn't delete the format",
        description: ApiError.from(error).message,
      }),
    onSettled: () => setDeleting(null),
  });
  const used = book.variants
    .map((v) => v.format)
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  return (
    <Panel
      id="book-formats"
      title="Formats and stock"
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing("new")}
          disabled={used.length >= 4 || Boolean(book.deleted_at)}
        >
          <Plus aria-hidden="true" /> Add format
        </Button>
      }
    >
      {book.variants.length === 0 ? (
        <p className="flex gap-2 rounded-md bg-warning-tint p-3 text-[15px]">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          No formats yet: the book stays hidden from the shop until it has one
          on sale.
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
                    {formatLabel(v.format)} ·{" "}
                    <span className="tabular-nums">
                      {formatUsd(v.price_usd)}
                    </span>
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
                  {isAdmin && v.cost_price_usd != null ? (
                    <FormatProfit price={v.price_usd} cost={v.cost_price_usd} />
                  ) : null}
                  {digital ? null : (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "tabular-nums",
                          v.is_low_stock
                            ? "font-semibold text-warning"
                            : "text-muted-foreground",
                        )}
                      >
                        {v.is_low_stock ? (
                          <AlertTriangle
                            className="mr-1 inline size-3.5 align-[-2px]"
                            aria-hidden="true"
                          />
                        ) : null}
                        {v.stock_quantity} in stock · alert at{" "}
                        {v.low_stock_threshold}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHistoryVariant(v)}
                        className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Stock history
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${formatLabel(v.format)}`}
                    onClick={() => setEditing(v)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  {isAdmin ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${formatLabel(v.format)}`}
                      onClick={() => setDeleting(v)}
                    >
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
          defaultCover={mainCover(book) || justCreated?.cover || ""}
          bookTitle={book.title}
          usedFormats={used}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={(saved) => {
            if (saved.cover_image_url) pendingCover.set(book.id, "");
            toast.success(
              editing === "new"
                ? `${formatLabel(saved.format)} added`
                : `${formatLabel(saved.format)} saved`,
            );
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
      <StockHistoryDrawer
        variant={
          historyVariant
            ? {
                id: historyVariant.id,
                book_title: book.title,
                format: historyVariant.format,
                sku: historyVariant.sku,
                stock_quantity: historyVariant.stock_quantity,
              }
            : null
        }
        open={Boolean(historyVariant)}
        onOpenChange={(open) => !open && setHistoryVariant(null)}
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
    else
      void queryClient.invalidateQueries({ queryKey: staffKeys.book(book.id) });
    void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
    void queryClient.invalidateQueries({ queryKey: ["staff", "trash"] });
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };
  const restore = useMutation({
    mutationFn: () => staffApi.restoreBook(book.id),
    onSuccess: (saved) => {
      toast.success(`"${book.title}" restored`);
      done(saved);
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't restore the book",
        description: ApiError.from(error).message,
      }),
  });

  return (
    <Panel id="book-danger" title={book.deleted_at ? "Deleted book" : "Delete"}>
      {book.deleted_at ? (
        <>
          <p className="text-[15px] text-muted-foreground">
            This book is hidden from the shop and the book list. Restore it to
            edit and sell it again.
          </p>
          <Button
            variant="outline"
            onClick={() => restore.mutate()}
            loading={restore.isPending}
            className="w-fit"
          >
            <RotateCcw aria-hidden="true" /> Restore book
          </Button>
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted-foreground">
            Moves the book to the Trash for 30 days. Past orders keep it, and you can
            restore it at any time.
          </p>
          <Button
            variant="outline"
            onClick={() => setConfirm(true)}
            className="w-fit border-destructive/50 text-destructive hover:bg-destructive-tint"
          >
            <Trash2 aria-hidden="true" /> Delete book
          </Button>
        </>
      )}
      <StrictDeleteDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Strict delete "${book.title}"`}
        itemName={book.title}
        entityLabel="book"
        description="Moves the book to the Trash for 30 days. To prevent accidental deletion, verify your administrator identity below."
        onConfirm={(payload) => staffApi.deleteBook(book.id, payload)}
        onSuccess={() => {
          toast.success({
            title: `"${book.title}" moved to trash`,
            description: "It can be restored from the Trash for 30 days.",
          });
          done();
        }}
      />
    </Panel>
  );
}

/* /admin/books/new and /admin/books/:id. */
export default function BookEditPage() {
  const { dict } = useT();
  const params = useParams();
  const isNew = params.id === undefined;
  const id = Number(params.id);
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const book = useQuery({
    ...staffQueries.book(id),
    enabled: !isNew && Number.isInteger(id) && id > 0,
  });

  if (isNew) {
    return (
      <AdminPage
        title="New book"
        lead={dict.bookForm.newLead}
        back={back}
      >
        <div className="max-w-3xl">
          <DetailsForm book={null} />
        </div>
      </AdminPage>
    );
  }
  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    (book.isError && ApiError.from(book.error).kind === "not_found")
  ) {
    return (
      <NotFoundState what="book" backTo="/admin/books" backLabel="All books" />
    );
  }
  if (book.isError)
    return (
      <ErrorState
        error={book.error}
        onRetry={() => book.refetch()}
        headingLevel="h1"
        showHomeLink={false}
      />
    );
  if (!book.data) {
    return (
      <SkeletonGroup
        label="Loading book…"
        className="mx-auto grid w-full max-w-[1200px] gap-4"
      >
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
          <Link
            to={`/books/${b.id}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink aria-hidden="true" /> View in shop
          </Link>
        ) : null
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <DetailsForm key={b.updated_at} book={b} />
        <div className="grid content-start gap-6">
          {!b.deleted_at ? <BookSalesPanel bookId={b.id} /> : null}
          <BookCoverPanel key={`${b.id}-${b.updated_at}-${b.variants.map((v) => v.cover_image_url ?? "").join("|")}`} book={b} />
          <Formats book={b} isAdmin={isAdmin} />
          <EbookPanel book={b} />
          {isAdmin ? <DangerZone book={b} /> : null}
        </div>
      </div>
    </AdminPage>
  );
}
