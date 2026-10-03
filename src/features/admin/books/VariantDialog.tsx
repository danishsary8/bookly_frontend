import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { staffApi, type StaffVariant, type VariantInput } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import type { BookFormat } from "@/api/types";
import { SelectField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { FORMATS } from "@/lib/catalog";

const DIGITAL = new Set(["ebook", "audiobook"]);
type Values = { format: string; sku: string; isbn: string; price_usd: string; stock_quantity: string; low_stock_threshold: string; cover_image_url: string; is_active: boolean };
type Errors = Partial<Record<keyof Values | "form", string>>;

const valuesFor = (variant: StaffVariant | null, format: string): Values => ({
  format: variant?.format ?? format,
  sku: variant?.sku ?? "",
  isbn: variant?.isbn ?? "",
  price_usd: variant?.price_usd ?? "",
  stock_quantity: String(variant?.stock_quantity ?? 0),
  low_stock_threshold: String(variant?.low_stock_threshold ?? 5),
  cover_image_url: variant?.cover_image_url ?? "",
  is_active: variant?.is_active ?? true,
});

function check(v: Values, digital: boolean): Errors {
  const e: Errors = {};
  if (!v.sku.trim()) e.sku = "Enter a SKU.";
  else if (v.sku.trim().length > 50) e.sku = "Keep the SKU under 50 characters.";
  if (v.isbn.trim().length > 20) e.isbn = "An ISBN has at most 20 characters.";
  if (!/^\d+(\.\d{1,2})?$/.test(v.price_usd.trim())) e.price_usd = "Enter a price in dollars, like 12.99.";
  if (!digital) {
    if (!/^\d+$/.test(v.stock_quantity.trim())) e.stock_quantity = "Enter a whole number, 0 or more.";
    if (!/^\d+$/.test(v.low_stock_threshold.trim())) e.low_stock_threshold = "Enter a whole number, 0 or more.";
  }
  if (v.cover_image_url.trim() && !/^https?:\/\/\S+$/.test(v.cover_image_url.trim())) e.cover_image_url = "Enter a full web address starting with https://.";
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
}: {
  bookId: number;
  variant: StaffVariant | null;
  usedFormats: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: StaffVariant) => void;
}) {
  const free = FORMATS.filter((f) => !usedFormats.includes(f.value));
  const [values, setValues] = useState<Values>(() => valuesFor(variant, free[0]?.value ?? "paperback"));
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
      const fields = ["format", "sku", "isbn", "price_usd", "stock_quantity", "low_stock_threshold", "cover_image_url"] as const;
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
      ...(digital ? {} : { stock_quantity: Number(values.stock_quantity), low_stock_threshold: Number(values.low_stock_threshold) }),
      cover_image_url: values.cover_image_url.trim() || null,
      is_active: values.is_active,
    });
  };

  const label = FORMATS.find((f) => f.value === values.format)?.label ?? "format";

  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent size="md">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{variant ? `Edit ${label.toLowerCase()}` : "Add a format"}</DialogTitle>
            <DialogDescription>{digital ? "Ebooks and audiobooks have no stock to track." : "Stock changes are recorded in the stock history."}</DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert ref={alertRef} title={errors.form} /> : null}
          {variant ? null : (
            <SelectField label="Format" value={values.format} onChange={(e) => set({ format: e.target.value })} error={errors.format}>
              {free.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </SelectField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="SKU" value={values.sku} onChange={(e) => set({ sku: e.target.value })} error={errors.sku} autoComplete="off" />
            <TextField label="ISBN" optional value={values.isbn} onChange={(e) => set({ isbn: e.target.value })} error={errors.isbn} autoComplete="off" />
            <TextField label="Price (USD)" inputMode="decimal" value={values.price_usd} onChange={(e) => set({ price_usd: e.target.value })} error={errors.price_usd} hint="Riel prices follow the exchange rate." />
            {digital ? null : (
              <>
                <TextField label="In stock" inputMode="numeric" value={values.stock_quantity} onChange={(e) => set({ stock_quantity: e.target.value })} error={errors.stock_quantity} />
                <TextField
                  label="Low-stock alert at"
                  inputMode="numeric"
                  value={values.low_stock_threshold}
                  onChange={(e) => set({ low_stock_threshold: e.target.value })}
                  error={errors.low_stock_threshold}
                  hint="Staff are notified when stock falls to this."
                />
              </>
            )}
          </div>
          <TextField label="Cover image URL" optional type="url" value={values.cover_image_url} onChange={(e) => set({ cover_image_url: e.target.value })} error={errors.cover_image_url} />
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-4 py-2">
            <span className="grid">
              <span className="font-semibold">On sale</span>
              <span className="text-sm text-muted-foreground">Off hides this format from the shop; past orders keep it.</span>
            </span>
            <Switch checked={values.is_active} onCheckedChange={(checked) => set({ is_active: checked })} />
          </label>
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
