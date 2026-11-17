import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { staffApi, type StaffVariant, type VariantInput } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import type { BookFormat } from "@/api/types";
import { SelectField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { Switch } from "@/components/ui/switch";
import { useStaff } from "@/features/admin/staffSession";
import { FormSection } from "./FormSection";
import { PricingFields } from "./PricingFields";
import { MONEY, suggestSku } from "./pricing";
import { FORMATS } from "@/lib/catalog";
import { validateImageUrl } from "@/lib/imageValidation";
import { useT } from "@/i18n";

const DIGITAL = new Set(["ebook", "audiobook"]);
type Values = { format: string; sku: string; isbn: string; price_usd: string; cost_price_usd: string; stock_quantity: string; low_stock_threshold: string; cover_image_url: string; is_active: boolean; release_date: string; allow_backorder: boolean; delay_note: string };
type Errors = Partial<Record<keyof Values | "form", string>>;

const valuesFor = (variant: StaffVariant | null, format: string, defaultCover = "", title = ""): Values => ({
  format: variant?.format ?? format,
  sku: variant?.sku ?? (title ? suggestSku(title, format) : ""),
  isbn: variant?.isbn ?? "",
  price_usd: variant?.price_usd ?? "",
  cost_price_usd: variant?.cost_price_usd ?? "",
  stock_quantity: String(variant?.stock_quantity ?? 0),
  low_stock_threshold: String(variant?.low_stock_threshold ?? 5),
  cover_image_url: variant ? (variant.cover_image_url ?? "") : defaultCover,
  is_active: variant?.is_active ?? true,
  release_date: variant?.release_date ?? "",
  allow_backorder: variant?.allow_backorder ?? false,
  delay_note: "",
});

function check(v: Values, digital: boolean): Errors {
  const e: Errors = {};
  if (!v.sku.trim()) e.sku = "Enter a SKU.";
  else if (v.sku.trim().length > 50) e.sku = "Keep the SKU under 50 characters.";
  if (v.isbn.trim().length > 20) e.isbn = "An ISBN has at most 20 characters.";
  if (!MONEY.test(v.price_usd.trim())) e.price_usd = "Enter a price in dollars, like 12.99.";
  if (v.cost_price_usd.trim() && !MONEY.test(v.cost_price_usd.trim())) e.cost_price_usd = "Enter a cost in dollars, like 8.50.";
  if (!digital) {
    if (!/^\d+$/.test(v.stock_quantity.trim())) e.stock_quantity = "Enter a whole number, 0 or more.";
    if (!/^\d+$/.test(v.low_stock_threshold.trim())) e.low_stock_threshold = "Enter a whole number, 0 or more.";
  }
  if (v.cover_image_url.trim()) {
    const check = validateImageUrl(v.cover_image_url);
    if (!check.ok) e.cover_image_url = check.error;
  }
  return e;
}

/*
 * Add or edit one format of a book: SKU, ISBN, price, stock and its alert level
 * (printed formats only: ebooks and audiobooks never run out), cover image and
 * whether it's on sale. Changing stock is logged by the API as an adjustment.
 */
export function VariantDialog({
  bookId,
  variant,
  usedFormats,
  open,
  onOpenChange,
  onSaved,
  defaultCover = "",
  bookTitle = "",
}: {
  /** A new format gets a SKU suggested from the title. */
  bookTitle?: string;
  /** A new format starts with the book's main cover (owner 2026-11-02). */
  defaultCover?: string;
  bookId: number;
  variant: StaffVariant | null;
  usedFormats: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: StaffVariant) => void;
}) {
  const free = FORMATS.filter((f) => !usedFormats.includes(f.value));
  const { dict } = useT();
  const t = dict.bookForm;
  const isAdmin = useStaff()?.user?.role === "admin";
  const [values, setValues] = useState<Values>(() => valuesFor(variant, free[0]?.value ?? "paperback", defaultCover, bookTitle));
  // The suggested SKU follows the format until someone types their own.
  const [skuTouched, setSkuTouched] = useState(Boolean(variant));
  const [errors, setErrors] = useState<Errors>({});
  const alertRef = useRef<HTMLDivElement>(null);
  const digital = DIGITAL.has(values.format);
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  const save = useMutation({
    mutationFn: (input: VariantInput) => (variant ? staffApi.updateVariant(variant.id, input) : staffApi.createVariant(bookId, input)),
    onSuccess: (saved) => {
      onSaved(saved);
      onOpenChange(false);
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      const fields = ["format", "sku", "isbn", "price_usd", "cost_price_usd", "stock_quantity", "low_stock_threshold", "cover_image_url"] as const;
      const next: Errors = {};
      for (const f of fields) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
      if (next.form) requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = check(values, digital);
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate({
      ...(variant ? {} : { format: values.format as BookFormat }),
      sku: values.sku.trim(),
      isbn: values.isbn.trim() || null,
      price_usd: values.price_usd.trim(),
      ...(isAdmin ? { cost_price_usd: values.cost_price_usd.trim() || null } : {}),
      ...(digital ? {} : { stock_quantity: Number(values.stock_quantity), low_stock_threshold: Number(values.low_stock_threshold) }),
      cover_image_url: values.cover_image_url.trim() || null,
      is_active: values.is_active,
    });
  };

  const label = FORMATS.find((f) => f.value === values.format)?.label ?? "format";

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent size="md">
        <form onSubmit={submit} noValidate className="book-form grid gap-6">
          <DialogHeader>
            <DialogTitle>{variant ? `Edit ${label.toLowerCase()}` : "Add a format"}</DialogTitle>
            <DialogDescription>{digital ? "Ebooks and audiobooks have no stock to track." : "Stock changes are recorded in the stock history."}</DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert ref={alertRef} title={errors.form} /> : null}
          <FormSection id="variant-codes" title={t.codes}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {variant ? null : (
                <SelectField
                  label={t.format}
                  containerClassName="sm:col-span-2"
                  value={values.format}
                  onChange={(e) => set({ format: e.target.value, ...(skuTouched || !bookTitle ? {} : { sku: suggestSku(bookTitle, e.target.value) }) })}
                  error={errors.format}
                >
                  {free.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </SelectField>
              )}
              <TextField
                label={t.sku}
                value={values.sku}
                onChange={(e) => {
                  setSkuTouched(true);
                  set({ sku: e.target.value });
                }}
                error={errors.sku}
                hint={variant || !bookTitle ? undefined : t.skuHint}
                autoComplete="off"
              />
              <TextField label="ISBN" optional inputMode="numeric" value={values.isbn} onChange={(e) => set({ isbn: e.target.value })} error={errors.isbn} autoComplete="off" />
            </div>
          </FormSection>
          <FormSection id="variant-pricing" title={t.pricing} hint={isAdmin ? t.pricingHint : undefined}>
            <PricingFields
              price={values.price_usd}
              cost={values.cost_price_usd}
              onPrice={(v) => set({ price_usd: v })}
              onCost={(v) => set({ cost_price_usd: v })}
              priceError={errors.price_usd}
              costError={errors.cost_price_usd}
              showCost={isAdmin}
            />
          </FormSection>
          {digital ? null : (
            <FormSection id="variant-stock" title={t.stockSection}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label={t.stock} inputMode="numeric" value={values.stock_quantity} onChange={(e) => set({ stock_quantity: e.target.value })} error={errors.stock_quantity} />
                <TextField
                  label="Low-stock alert at"
                  inputMode="numeric"
                  value={values.low_stock_threshold}
                  onChange={(e) => set({ low_stock_threshold: e.target.value })}
                  error={errors.low_stock_threshold}
                  hint="Staff are notified when stock falls to this."
                />
              </div>
            </FormSection>
          )}
          <FormSection id="variant-sale" title={t.visibility}>
            <ImageUploadField
              label="Cover image"
              optional
              value={values.cover_image_url}
              onChange={(url) => set({ cover_image_url: url })}
              error={errors.cover_image_url}
            />
            <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-4 py-2">
              <span className="grid">
                <span className="font-semibold">On sale</span>
                <span className="text-sm text-muted-foreground">Off hides this format from the shop; past orders keep it.</span>
              </span>
              <Switch checked={values.is_active} onCheckedChange={(checked) => set({ is_active: checked })} />
            </label>
          </FormSection>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>
              {variant ? "Save format" : "Add format"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
