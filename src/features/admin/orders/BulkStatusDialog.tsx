import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { opsApi, type BulkStatusResult, type BulkStatusTarget } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/api/types";
import { toast } from "@/stores/toast";

/** The bulk steps (cancel stays one order at a time: it gives stock and coupons back). Same words as the order page. */
const TARGETS: Array<{ value: BulkStatusTarget; label: string; Icon: typeof Truck; detail: string }> = [
  { value: "processing", label: "Start processing", Icon: PackageCheck, detail: "Confirmed and being packed. Customers can no longer cancel them." },
  { value: "shipped", label: "Mark as shipped", Icon: Truck, detail: "With the courier." },
  { value: "delivered", label: "Mark as delivered", Icon: CheckCircle2, detail: "The customers have the books and paid the courier: cash is recorded as received." },
];

const orders = (n: number) => `${n} ${n === 1 ? "order" : "orders"}`;

/*
 * Change the status of the ticked orders together. Each order changes on its own (the API's rules,
 * history, audit and customer email); the dialog then lists any order that could not move and why.
 */
export function BulkStatusDialog({ ids, allowed = [], open, onOpenChange, onDone }: {
  ids: number[];
  /** Each ticked order's allowed next steps (owner 2026-11-17: only offer steps that fit, instead of failing after). */
  allowed?: OrderStatus[][];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (result: BulkStatusResult) => void;
}) {
  const queryClient = useQueryClient();
  const fits = (target: BulkStatusTarget) => (allowed.length ? allowed.filter((a) => a.includes(target)).length : ids.length);
  const best = TARGETS.reduce((top, t) => (fits(t.value) > fits(top.value) ? t : top), TARGETS[0]).value;
  const [picked, setStatus] = useState<BulkStatusTarget | null>(null);
  const status: BulkStatusTarget = picked && fits(picked) > 0 ? picked : best;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkStatusResult | null>(null);

  const reset = () => {
    setResult(null);
    setError(null);
    setNote("");
    setStatus(null);
  };

  const change = useMutation({
    mutationFn: () => opsApi.bulkOrderStatus(ids, status, note.trim() || undefined),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
      onDone(data);
      if (data.updated.length) toast.success({ title: `${orders(data.updated.length)} updated`, description: TARGETS.find((t) => t.value === data.status)?.label });
      if (data.failed.length) {
        setResult(data);
      } else {
        reset();
        onOpenChange(false);
      }
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("status") ?? apiError.field("ids") ?? apiError.field("note") ?? apiError.message);
    },
  });

  const close = (next: boolean) => {
    if (change.isPending) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    change.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="sm">
        {result ? (
          <div className="grid gap-5">
            <DialogHeader>
              <DialogTitle>{result.updated.length ? `${orders(result.updated.length)} updated` : "No orders changed"}</DialogTitle>
              <DialogDescription>
                {orders(result.failed.length)} stayed as {result.failed.length === 1 ? "it was and is" : "they were and are"} still ticked:
              </DialogDescription>
            </DialogHeader>
            <ul aria-label="Not changed" className="grid max-h-72 gap-2 overflow-y-auto">
              {result.failed.map((f) => (
                <li key={f.id} className="rounded-md border border-border px-3 py-2">
                  <span className="block font-semibold tabular-nums">{f.order_number ?? `Order #${f.id}`}</span>
                  <span className="block text-sm text-muted-foreground">{f.reason}</span>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">Done</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Change status: {orders(ids.length)}</DialogTitle>
              <DialogDescription>Each order moves on its own; any that can't take this step stay as they are and are listed. Cancel orders one at a time.</DialogDescription>
            </DialogHeader>
            {error ? <FormAlert title={error} /> : null}
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">New status</legend>
              <RadioGroup value={status} onValueChange={(v) => setStatus(v as BulkStatusTarget)} aria-label="New status" className="gap-2">
                {TARGETS.map(({ value, label, Icon, detail }) => {
                  const n = fits(value);
                  const none = n === 0;
                  return (
                    <label key={value} className={cn("flex items-start gap-3 rounded-md border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-lapis-tint", none ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                      <RadioGroupItem value={value} aria-label={label} disabled={none} className="mt-0.5" />
                      <span className="grid flex-1 gap-0.5">
                        <span className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <Icon className="size-4" aria-hidden="true" /> {label}
                          </span>
                          {allowed.length ? (
                            <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", n === ids.length ? "bg-success-tint text-success" : none ? "bg-surface-2 text-muted-foreground" : "bg-warning-tint text-foreground")}>
                              {none ? "No ticked order can" : `${n} of ${ids.length} can`}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm text-muted-foreground">{detail}</span>
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </fieldset>
            <TextAreaField label="Note for each timeline" optional hint="Every customer sees this on their order. Up to 500 characters." maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={change.isPending}>
                  Back
                </Button>
              </DialogClose>
              <Button type="submit" loading={change.isPending}>
                {TARGETS.find((t) => t.value === status)!.label}: {orders(ids.length)}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
