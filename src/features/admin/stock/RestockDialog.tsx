import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supplierQueries } from "@/api/endpoints/suppliers";
import { staffApi, type RestockInput } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { useT } from "@/i18n";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatLabel } from "@/lib/catalog";
import { usePortalPath } from "@/features/admin/portal";
import { toast } from "@/stores/toast";

interface RestockVariantInfo {
  id: number;
  book_title?: string;
  publisher_id?: number | null;
  format?: string;
  sku: string;
  stock_quantity: number;
}

interface Values {
  quantity: string;
  /** "" = none, "other" = typed name, otherwise a supplier id. */
  supplier_choice: string;
  supplier: string;
  unit_cost_usd: string;
  note: string;
}

type Errors = Partial<Record<keyof Values | "form", string>>;

const initialValues: Values = {
  quantity: "",
  supplier_choice: "",
  supplier: "",
  unit_cost_usd: "",
  note: "",
};

export function RestockDialog({
  variant,
  open,
  onOpenChange,
  onRestocked,
}: {
  variant: RestockVariantInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestocked?: () => void;
}) {
  const queryClient = useQueryClient();
  const toPortal = usePortalPath();
  const { dict } = useT();
  const ts = dict.suppliers;
  // Active suppliers to pick from; on an API without suppliers (404) the free-text field stays.
  const suppliers = useQuery({ ...supplierQueries.list({ active: "1" }), enabled: open, retry: false });
  const picker = suppliers.isSuccess;
  const [values, setValues] = useState<Values>(initialValues);
  // The book's own publisher, when it sells direct: listed first and picked by default (owner 2026-11-17).
  const own = picker && variant?.publisher_id ? suppliers.data.find((x) => x.publisher?.id === variant.publisher_id) : undefined;
  const [suggested, setSuggested] = useState<string | null>(null);
  if (own && open && suggested !== `${variant?.id}:${own.id}`) {
    setSuggested(`${variant?.id}:${own.id}`);
    if (!values.supplier_choice) setValues((v) => ({ ...v, supplier_choice: String(own.id) }));
  }
  const publishers = picker ? suppliers.data.filter((x) => x.type === "publisher" && x.id !== own?.id) : [];
  const others = picker ? suppliers.data.filter((x) => x.type !== "publisher" && x.id !== own?.id) : [];
  const [errors, setErrors] = useState<Errors>({});
  const alertRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  const restock = useMutation({
    mutationFn: (input: RestockInput) => {
      if (!variant) throw new Error("No variant selected");
      return staffApi.restockVariant(variant.id, input);
    },
    onSuccess: (data) => {
      toast.success(`Restocked ${data.movement.change_qty} copies of ${variant?.sku ?? "variant"}`);
      void queryClient.invalidateQueries({ queryKey: ["staff", "stock"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "variants"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onRestocked?.();
      onOpenChange(false);
      setValues(initialValues);
      setSuggested(null);
      setErrors({});
    },
    onError: (error) => {
      const apiError = ApiError.from(error);
      const fields = ["quantity", "supplier", "unit_cost_usd", "note"] as const;
      const supplierIdError = apiError.field("supplier_id");
      const next: Errors = {};
      for (const f of fields) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (supplierIdError) next.supplier = supplierIdError;
      if (!Object.keys(next).length) next.form = apiError.message;
      setErrors(next);
      if (next.form) requestAnimationFrame(() => alertRef.current?.focus());
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const e: Errors = {};
    const qty = Number(values.quantity.trim());
    if (!values.quantity.trim() || !Number.isInteger(qty) || qty < 1 || qty > 10000) {
      e.quantity = "Enter a quantity between 1 and 10,000.";
    }
    if (values.supplier.trim().length > 150) {
      e.supplier = "Supplier must be 150 characters or less.";
    }
    if (values.unit_cost_usd.trim()) {
      if (!/^\d+(\.\d{1,2})?$/.test(values.unit_cost_usd.trim())) {
        e.unit_cost_usd = "Enter a valid dollar amount with at most 2 decimals.";
      } else {
        const cost = Number(values.unit_cost_usd.trim());
        if (cost < 0 || cost > 99999.99) {
          e.unit_cost_usd = "Cost per unit must be between $0 and $99,999.99.";
        }
      }
    }
    if (values.note.trim().length > 500) {
      e.note = "Note must be 500 characters or less.";
    }

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const chosenId = picker && values.supplier_choice && values.supplier_choice !== "other" ? Number(values.supplier_choice) : null;
    restock.mutate({
      quantity: qty,
      ...(chosenId ? { supplier_id: chosenId } : {}),
      supplier: chosenId ? null : picker && values.supplier_choice !== "other" ? null : values.supplier.trim() || null,
      unit_cost_usd: values.unit_cost_usd.trim() || null,
      note: values.note.trim() || null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!restock.isPending) {
          if (!next) {
            setValues(initialValues);
            setSuggested(null);
            setErrors({});
          }
          onOpenChange(next);
        }
      }}
    >
      <DialogContent size="md">
        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              Restock {variant ? `${variant.book_title ? `${variant.book_title} — ` : ""}${formatLabel(variant.format)}` : "variant"}
            </DialogTitle>
            <DialogDescription>
              Current stock: <strong className="text-foreground">{variant?.stock_quantity ?? 0}</strong>. Enter new units received.
            </DialogDescription>
          </DialogHeader>

          {errors.form ? <FormAlert ref={alertRef} title={errors.form} /> : null}

          <div className="grid gap-4">
            <TextField
              label="Quantity received"
              inputMode="numeric"
              required
              autoFocus
              value={values.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
              error={errors.quantity}
              placeholder="e.g. 50"
            />

            <TextField
              label="Cost per unit (admins only see this later)"
              optional
              inputMode="decimal"
              value={values.unit_cost_usd}
              onChange={(e) => set({ unit_cost_usd: e.target.value })}
              error={errors.unit_cost_usd}
              placeholder="e.g. 4.50"
              hint="Unit purchase cost in USD. Kept private from staff."
            />

            {picker ? (
              <div className="grid gap-2">
                <SelectField
                  label={ts.picker}
                  optional
                  value={values.supplier_choice}
                  onChange={(e) => set({ supplier_choice: e.target.value })}
                  error={values.supplier_choice !== "other" ? errors.supplier : undefined}
                  hint={<Link to={toPortal("suppliers")} className="font-semibold text-primary underline-offset-4 hover:underline">{ts.manage}</Link>}
                >
                  <option value="">{ts.pickerNone}</option>
                  {own ? (
                    <optgroup label={ts.ownPublisher}>
                      <option value={String(own.id)}>{own.name}</option>
                    </optgroup>
                  ) : null}
                  {publishers.length ? (
                    <optgroup label={ts.publishers}>
                      {publishers.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                    </optgroup>
                  ) : null}
                  {others.length ? (
                    <optgroup label={ts.distributors}>
                      {others.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                    </optgroup>
                  ) : null}
                  <option value="other">{ts.pickerOther}</option>
                </SelectField>
                {values.supplier_choice === "other" ? (
                  <TextField label={ts.pickerOtherName} value={values.supplier} onChange={(e) => set({ supplier: e.target.value })} error={errors.supplier} placeholder="e.g. Phnom Penh Book Distributors" />
                ) : null}
              </div>
            ) : (
              <TextField
                label="Supplier"
                optional
                value={values.supplier}
                onChange={(e) => set({ supplier: e.target.value })}
                error={errors.supplier}
                placeholder="e.g. Phnom Penh Book Distributors"
              />
            )}

            <TextAreaField
              label="Note"
              optional
              rows={2}
              value={values.note}
              onChange={(e) => set({ note: e.target.value })}
              error={errors.note}
              placeholder="e.g. Batch invoice #10492"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={restock.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={restock.isPending}>
              Confirm restock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
