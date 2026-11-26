import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Info } from "lucide-react";
import { staffApi, type PriceChangeInput, type PriceChangeRow, type StaffBook } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { AdminFormDialogContent as DialogContent } from "@/features/admin/AdminFormDialog";
import { FormAlert } from "@/components/form/FormAlert";
import { SelectField, TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

/*
 * Bulk "Change prices" (admin, owner 2026-11-26). Step 1 picks the rules, step 2 shows the
 * server's preview (the same planner that saves), then Apply. Past orders keep their prices.
 */

type SellMode = PriceChangeInput["sell_mode"];
type CostMode = PriceChangeInput["cost_mode"];

const SELL_MODES: Array<{ value: SellMode; label: string; unit?: string; placeholder?: string }> = [
  { value: "keep", label: "Keep as is" },
  { value: "set", label: "Set to a price", unit: "$", placeholder: "4.90" },
  { value: "percent", label: "Change by %", unit: "%", placeholder: "-20" },
  { value: "amount", label: "Change by $", unit: "$", placeholder: "-1.00" },
  { value: "markup", label: "Cost × markup", unit: "×", placeholder: "1.6" },
];
const COST_MODES = SELL_MODES.filter((m) => m.value !== "markup") as Array<{ value: CostMode; label: string; unit?: string; placeholder?: string }>;

const FORMATS = [
  { value: "all", label: "All formats" },
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audiobook" },
];

const FORMAT_LABEL: Record<string, string> = { paperback: "Paperback", hardcover: "Hardcover", ebook: "Ebook", audiobook: "Audiobook" };
const NOTE: Record<string, string> = { below_cost: "Kept: would sell under cost", no_cost: "Skipped: no cost price" };

const money = (v: string | null) => (v === null ? "—" : `$${v}`);

function RuleCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-xl border border-border bg-surface-1 p-4">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </fieldset>
  );
}

export function PriceChangeDialog({ books, onClose, onSuccess }: { books: StaffBook[]; onClose: () => void; onSuccess: () => void }) {
  const [format, setFormat] = useState("all");
  const [sellMode, setSellMode] = useState<SellMode>("set");
  const [sellValue, setSellValue] = useState("");
  const [rounding, setRounding] = useState<PriceChangeInput["rounding"]>("90");
  const [costMode, setCostMode] = useState<CostMode>("keep");
  const [costValue, setCostValue] = useState("");
  const [floorAtCost, setFloorAtCost] = useState(true);
  const [rows, setRows] = useState<PriceChangeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const variantIds = books.flatMap((b) => b.variants.filter((v) => format === "all" || v.format === format).map((v) => v.id));
  const sell = SELL_MODES.find((m) => m.value === sellMode)!;
  const cost = COST_MODES.find((m) => m.value === costMode)!;

  const input = (): PriceChangeInput => ({
    variant_ids: variantIds,
    sell_mode: sellMode,
    sell_value: sellMode === "keep" ? null : Number(sellValue),
    cost_mode: costMode,
    cost_value: costMode === "keep" ? null : Number(costValue),
    rounding: sellMode === "keep" ? "none" : rounding,
    floor_at_cost: floorAtCost,
  });

  const fail = (e: unknown) => setError(ApiError.from(e).message);
  const preview = useMutation({ mutationFn: () => staffApi.previewPriceChange(input()), onSuccess: (d) => { setError(null); setRows(d.items); }, onError: fail });
  const apply = useMutation({
    mutationFn: () => staffApi.applyPriceChange(input()),
    onSuccess: (d) => {
      toast.success(d.updated_count === 1 ? "Changed the price of 1 format." : `Changed the prices of ${d.updated_count} formats.`);
      onSuccess();
      onClose();
    },
    onError: fail,
  });

  const invalid = (mode: string, value: string) => mode !== "keep" && (value.trim() === "" || Number.isNaN(Number(value)));
  const canPreview = variantIds.length > 0 && !(sellMode === "keep" && costMode === "keep") && !invalid(sellMode, sellValue) && !invalid(costMode, costValue);
  const changed = rows?.filter((r) => r.changed) ?? [];
  const kept = (rows?.length ?? 0) - changed.length;

  return (
    <Dialog open onOpenChange={(open) => !open && !apply.isPending && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Change prices</DialogTitle>
          <DialogDescription>
            {books.length === 1 ? "1 book" : `${books.length} books`} · {variantIds.length === 1 ? "1 format" : `${variantIds.length} formats`}. Past orders keep the price they were bought at.
          </DialogDescription>
        </DialogHeader>

        {error ? <FormAlert>{error}</FormAlert> : null}

        {rows === null ? (
          <div className="mt-4 grid gap-4">
            <div role="radiogroup" aria-label="Formats" className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={format === f.value}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    format === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-surface-2",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <RuleCard title="Cost price" hint="What you pay the supplier. Changed first, so a markup uses the new cost.">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="Change" value={costMode} onChange={(e) => setCostMode(e.target.value as CostMode)}>
                  {COST_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </SelectField>
                {costMode !== "keep" ? (
                  <TextField label={`Value (${cost.unit})`} inputMode="decimal" placeholder={cost.placeholder} value={costValue} onChange={(e) => setCostValue(e.target.value)} />
                ) : null}
              </div>
            </RuleCard>

            <RuleCard title="Sell price" hint="What customers pay.">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="Change" value={sellMode} onChange={(e) => setSellMode(e.target.value as SellMode)}>
                  {SELL_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </SelectField>
                {sellMode !== "keep" ? (
                  <TextField label={`Value (${sell.unit})`} inputMode="decimal" placeholder={sell.placeholder} value={sellValue} onChange={(e) => setSellValue(e.target.value)} />
                ) : null}
              </div>
              {sellMode !== "keep" ? (
                <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                  <SelectField label="Round to" value={rounding} onChange={(e) => setRounding(e.target.value as PriceChangeInput["rounding"])}>
                    <option value="90">Nearest .90 ($4.87 → $4.90)</option>
                    <option value="50">Nearest .50</option>
                    <option value="whole">Whole dollar</option>
                    <option value="none">No rounding</option>
                  </SelectField>
                  <label className="flex min-h-12 items-center gap-2.5 text-sm">
                    <Checkbox checked={floorAtCost} onCheckedChange={(v) => setFloorAtCost(v === true)} />
                    Never sell under cost
                  </label>
                </div>
              ) : null}
            </RuleCard>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <strong>{changed.length}</strong> {changed.length === 1 ? "format changes" : "formats change"}
                {kept ? <> · {kept} unchanged</> : null}. Nothing is saved until you apply.
              </span>
            </p>
            <div className="max-h-[46vh] overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Book</th>
                    <th className="px-3 py-2 font-semibold">Sell price</th>
                    <th className="px-3 py-2 font-semibold">Cost</th>
                    <th className="px-3 py-2 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.variant_id} className={cn(!r.changed && "text-muted-foreground")}>
                      <td className="px-3 py-2.5">
                        <p className="line-clamp-1 font-medium text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {FORMAT_LABEL[r.format] ?? r.format}
                          {r.note ? <span className="ml-1.5 rounded bg-warning-tint px-1.5 py-0.5 font-medium text-foreground">{NOTE[r.note]}</span> : null}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        <Change from={r.old_price_usd} to={r.new_price_usd} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                        <Change from={r.old_cost_usd} to={r.new_cost_usd} />
                      </td>
                      <td className={cn("px-3 py-2.5 text-right tabular-nums", r.margin_percent !== null && r.margin_percent < 20 && "font-semibold text-destructive")}>
                        {r.margin_percent === null ? "—" : `${r.margin_percent}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="mt-5">
          {rows === null ? (
            <>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button disabled={!canPreview} loading={preview.isPending} onClick={() => preview.mutate()}>
                Preview changes <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={apply.isPending} onClick={() => setRows(null)}>Back</Button>
              <Button disabled={changed.length === 0} loading={apply.isPending} onClick={() => apply.mutate()}>
                {changed.length === 1 ? "Apply 1 change" : `Apply ${changed.length} changes`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Change({ from, to }: { from: string | null; to: string | null }) {
  if (from === to) return <span>{money(to)}</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground line-through">{money(from)}</span>
      <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
      <span className="font-semibold text-foreground">{money(to)}</span>
    </span>
  );
}
