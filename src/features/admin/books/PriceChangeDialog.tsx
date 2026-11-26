import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, History, Info, Undo2 } from "lucide-react";
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
const DIGITAL = new Set(["ebook", "audiobook"]);
/** Why a row did not change. Ebooks never have a cost, so they get their own wording. */
const noteText = (r: PriceChangeRow) =>
  r.note === "below_cost" ? "Kept: under cost"
  : r.note === "no_cost" ? (DIGITAL.has(r.format) ? "Needs “Set” or “%”" : "No cost price yet")
  : r.note === "digital" ? "No cost (digital)"
  : null;

const money = (v: string | null) => (v === null ? "—" : `$${v}`);

/** The last rule applied in this browser, offered again in one click (owner 2026-11-26). */
type SavedRule = { format: string; sellMode: SellMode; sellValue: string; rounding: PriceChangeInput["rounding"]; costMode: CostMode; costValue: string; floorAtCost: boolean };
const LAST_RULE_KEY = "bookly.admin.lastPriceRule";
const readLastRule = (): SavedRule | null => {
  try {
    const raw = localStorage.getItem(LAST_RULE_KEY);
    return raw ? (JSON.parse(raw) as SavedRule) : null;
  } catch {
    return null;
  }
};
const ROUND_LABEL: Record<string, string> = { "90": "round .90", "50": "round .50", whole: "whole $", none: "" };
/** "Cost: set $3 · Sell: cost × 1.6, round .90 · Paperback" */
function describeRule(r: SavedRule): string {
  const val = (mode: string, v: string) =>
    mode === "set" ? `set $${v}` : mode === "percent" ? `${Number(v) > 0 ? "+" : ""}${v}%` : mode === "amount" ? `${Number(v) > 0 ? "+" : ""}$${v}` : mode === "markup" ? `cost × ${v}` : "";
  const parts: string[] = [];
  if (r.costMode !== "keep") parts.push(`Cost: ${val(r.costMode, r.costValue)}`);
  if (r.sellMode !== "keep") parts.push(`Sell: ${[val(r.sellMode, r.sellValue), ROUND_LABEL[r.rounding]].filter(Boolean).join(", ")}`);
  if (r.format !== "all") parts.push(FORMAT_LABEL[r.format] ?? r.format);
  return parts.join(" · ");
}

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

export function PriceChangeDialog({ books, scope, onClose, onSuccess }: { books: StaffBook[]; scope?: string; onClose: () => void; onSuccess: () => void }) {
  const [format, setFormat] = useState("all");
  const [sellMode, setSellMode] = useState<SellMode>("set");
  const [sellValue, setSellValue] = useState("");
  const [rounding, setRounding] = useState<PriceChangeInput["rounding"]>("90");
  const [costMode, setCostMode] = useState<CostMode>("keep");
  const [costValue, setCostValue] = useState("");
  const [floorAtCost, setFloorAtCost] = useState(true);
  const [lastRule] = useState(readLastRule);
  const applyLastRule = (r: SavedRule) => {
    setFormat(r.format);
    setSellMode(r.sellMode);
    setSellValue(r.sellValue);
    setRounding(r.rounding);
    setCostMode(r.costMode);
    setCostValue(r.costValue);
    setFloorAtCost(r.floorAtCost);
  };
  const [rows, setRows] = useState<PriceChangeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Only the rows that did not change because of a problem (no cost / under cost). */
  const [onlyIssues, setOnlyIssues] = useState(false);
  /** After Apply: the rows saved, so they can be undone. */
  const [applied, setApplied] = useState<PriceChangeRow[] | null>(null);

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
      setError(null);
      setApplied(d.items.filter((r) => r.changed));
      try {
        const saved: SavedRule = { format, sellMode, sellValue, rounding, costMode, costValue, floorAtCost };
        localStorage.setItem(LAST_RULE_KEY, JSON.stringify(saved));
      } catch {
        /* private mode: nothing to remember */
      }
      onSuccess();
    },
    onError: fail,
  });
  const undo = useMutation({
    mutationFn: () => staffApi.restorePrices((applied ?? []).map((r) => ({ variant_id: r.variant_id, price_usd: r.old_price_usd, cost_price_usd: r.old_cost_usd }))),
    onSuccess: (d) => {
      toast.success(d.restored_count === 1 ? "Undone: 1 format has its old price back." : `Undone: ${d.restored_count} formats have their old prices back.`);
      onSuccess();
      onClose();
    },
    onError: fail,
  });
  const busy = apply.isPending || undo.isPending;

  const invalid = (mode: string, value: string) => mode !== "keep" && (value.trim() === "" || Number.isNaN(Number(value)));
  const canPreview = variantIds.length > 0 && !(sellMode === "keep" && costMode === "keep") && !invalid(sellMode, sellValue) && !invalid(costMode, costValue);
  const changed = rows?.filter((r) => r.changed) ?? [];
  const kept = (rows?.length ?? 0) - changed.length;
  const noCost = rows?.filter((r) => r.note === "no_cost" && !DIGITAL.has(r.format)).length ?? 0;
  const digitalSkipped = rows?.filter((r) => r.note === "no_cost" && DIGITAL.has(r.format)).length ?? 0;
  const underCost = rows?.filter((r) => r.note === "below_cost").length ?? 0;
  const issues = noCost + underCost + digitalSkipped;
  const shown = rows && onlyIssues ? rows.filter((r) => r.note === "no_cost" || r.note === "below_cost") : rows;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Change prices</DialogTitle>
          <DialogDescription>
            {scope ?? (books.length === 1 ? "1 book" : `${books.length} books`)} · {variantIds.length === 1 ? "1 format" : `${variantIds.length} formats`}. Past orders keep the price they were bought at.
          </DialogDescription>
        </DialogHeader>

        {error ? <FormAlert>{error}</FormAlert> : null}

        {applied ? (
          <div className="mt-5 grid justify-items-center gap-3 rounded-xl border border-success/30 bg-success-tint px-5 py-7 text-center">
            <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
            <p className="font-display text-2xl text-foreground">{applied.length === 1 ? "1 format changed" : `${applied.length} formats changed`}</p>
            <p className="max-w-sm text-sm text-muted-foreground">New orders use the new prices now. Changed your mind? Undo puts every old price and cost back.</p>
          </div>
        ) : rows === null ? (
          <div className="mt-4 grid gap-4">
            {lastRule && describeRule(lastRule) ? (
              <button
                type="button"
                onClick={() => applyLastRule(lastRule)}
                className="flex items-center gap-3 rounded-xl border border-primary/25 bg-lapis-tint/50 px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary/50 hover:bg-lapis-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <History className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">Use last rule</span>
                  <span className="block truncate text-muted-foreground">{describeRule(lastRule)}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
              </button>
            ) : null}
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

            <RuleCard title="Cost price" hint="What you pay the supplier. Changed first, so a markup uses the new cost. Ebooks and audiobooks are left out.">
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
            {issues ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-warning/40 bg-warning-tint px-3 py-2.5 text-sm">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                  <span className="grid gap-1">
                    {noCost ? <span><strong>{noCost}</strong> {noCost === 1 ? "book has" : "books have"} no cost price yet, so the markup skipped {noCost === 1 ? "it" : "them"}. Set a cost first: Cost price → Set to a price.</span> : null}
                    {digitalSkipped ? <span><strong>{digitalSkipped}</strong> {digitalSkipped === 1 ? "ebook was" : "ebooks were"} skipped: ebooks have no cost, so use “Set to a price” or “Change by %” for them (pick the Ebook chip).</span> : null}
                    {underCost ? <span><strong>{underCost}</strong> would sell under cost, so {underCost === 1 ? "it keeps its" : "they keep their"} price.</span> : null}
                  </span>
                </p>
                <button type="button" onClick={() => setOnlyIssues((v) => !v)} className="shrink-0 rounded-md px-2 py-1 font-semibold text-primary underline-offset-4 hover:underline">
                  {onlyIssues ? "Show all" : "Show only these"}
                </button>
              </div>
            ) : null}
            <div className="max-h-[46vh] overflow-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Book</th>
                    <th className="max-sm:hidden px-3 py-2 font-semibold">Sell price</th>
                    <th className="max-sm:hidden px-3 py-2 font-semibold">Cost</th>
                    <th className="max-sm:hidden px-3 py-2 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(shown ?? []).map((r) => (
                    <tr key={r.variant_id} className={cn(!r.changed && "text-muted-foreground")}>
                      <td className="px-3 py-2.5">
                        <p className="line-clamp-1 font-medium text-foreground">{r.title}</p>
                        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                          {FORMAT_LABEL[r.format] ?? r.format}
                          {noteText(r) ? <span className="whitespace-nowrap rounded bg-warning-tint px-1.5 py-0.5 font-medium text-foreground">{noteText(r)}</span> : null}
                        </p>
                        {/* Phones: the numbers sit under the title instead of in columns. */}
                        <div className="mt-1.5 grid gap-0.5 text-xs tabular-nums sm:hidden">
                          <span className="flex items-center gap-1.5"><span className="w-10 text-muted-foreground">Price</span><Change from={r.old_price_usd} to={r.new_price_usd} /></span>
                          <span className="flex items-center gap-1.5"><span className="w-10 text-muted-foreground">Cost</span><Change from={r.old_cost_usd} to={r.new_cost_usd} /></span>
                          {r.margin_percent !== null ? <span className={cn("flex items-center gap-1.5", r.margin_percent < 20 && "font-semibold text-destructive")}><span className="w-10 text-muted-foreground">Margin</span>{r.margin_percent}%</span> : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums max-sm:hidden">
                        <Change from={r.old_price_usd} to={r.new_price_usd} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums max-sm:hidden">
                        <Change from={r.old_cost_usd} to={r.new_cost_usd} />
                      </td>
                      <td className={cn("px-3 py-2.5 text-right tabular-nums max-sm:hidden", r.margin_percent !== null && r.margin_percent < 20 && "font-semibold text-destructive")}>
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
          {applied ? (
            <>
              <Button variant="outline" loading={undo.isPending} onClick={() => undo.mutate()}>
                <Undo2 aria-hidden="true" /> Undo
              </Button>
              <Button disabled={undo.isPending} onClick={onClose}>Done</Button>
            </>
          ) : rows === null ? (
            <>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button disabled={!canPreview} loading={preview.isPending} onClick={() => preview.mutate()}>
                Preview changes <ArrowRight aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={apply.isPending} onClick={() => { setRows(null); setOnlyIssues(false); }}>Back</Button>
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
