import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, QrCode } from "lucide-react";
import { opsApi, opsKeys, type StaffOrder, type StaffPayment } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { orderDateTime } from "@/features/orders/format";
import { toast } from "@/stores/toast";

/*
 * The Payment box on /admin/orders/:id (KHQR payments design 2026-11-02, branch khqr-admin). Cash on delivery as
 * before; a KHQR order lists each QR (USD / KHR), how it was paid (Bakong, test, staff) and, for admins, "Mark as paid"
 * with a required note, for money seen in the bank app. A payment that arrived after a cancel is flagged for a refund.
 */

const money = (p: StaffPayment) =>
  p.currency === "KHR" ? `${Number(p.amount).toLocaleString("en-US", { maximumFractionDigits: 0 })} ៛` : `$${Number(p.amount).toFixed(2)}`;

const STATUS: Record<StaffPayment["status"], { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  succeeded: { label: "Paid", tone: "success" },
  pending: { label: "Waiting", tone: "warning" },
  failed: { label: "Closed", tone: "neutral" },
  refunded: { label: "Refunded", tone: "neutral" },
};
const HOW: Record<NonNullable<StaffPayment["how"]>, string> = { bakong: "checked with Bakong", test: "test payment, no real money", staff: "confirmed by staff" };

function MarkPaidDialog({ order, onClose }: { order: StaffOrder; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mark = useMutation({
    mutationFn: () => opsApi.markOrderPaid(order.id!, note.trim()),
    onSuccess: (saved) => {
      queryClient.setQueryData(opsKeys.order(order.id!), saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
      toast.success({ title: "Marked as paid", description: order.order_number });
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("note") ?? apiError.field("order") ?? apiError.message);
      void queryClient.invalidateQueries({ queryKey: opsKeys.order(order.id!) });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 3) {
      setError("Write how you checked the payment (at least 3 characters).");
      return;
    }
    setError(null);
    mark.mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !mark.isPending && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Mark {order.order_number} as paid?</DialogTitle>
            <DialogDescription>Only when you have seen the money arrive, e.g. in your bank app. The order becomes paid and the customer gets the order confirmation.</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={error} /> : null}
          <TextAreaField label="How did you check?" hint="Saved in the audit log and the order timeline. 3 to 500 characters." maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Seen in ABA app at 10:05, $26.50 from Sok Dara" />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={mark.isPending}>
                Back
              </Button>
            </DialogClose>
            <Button type="submit" loading={mark.isPending}>
              Mark as paid
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrderPaymentCard({ order, isAdmin }: { order: StaffOrder; isAdmin: boolean }) {
  const [marking, setMarking] = useState(false);
  const khqr = order.payment_method === "khqr";
  const rows = (order.payments ?? []).filter((p) => p.provider === "bakong");
  const late = rows.find((p) => p.paid_after_cancel);
  const waiting = khqr && order.status === "pending";

  return (
    <section aria-labelledby="order-payment" className="grid gap-2 rounded-xl border border-border bg-card p-5">
      <h2 id="order-payment" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
        Payment
      </h2>
      {!khqr ? (
        <>
          <p>Cash on delivery</p>
          <p className="text-sm text-muted-foreground">{order.payment_status === "succeeded" ? "Collected" : order.payment_status === "refunded" ? "Refunded" : "Not collected yet"}</p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2">
            <QrCode className="size-4 text-muted-foreground" aria-hidden="true" /> Bakong KHQR
          </p>
          {late ? (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Paid {money(late)} after the order was cancelled. Refund the customer by hand.
            </p>
          ) : null}
          {rows.length ? (
            <ul className="grid divide-y divide-border text-sm" aria-label="KHQR codes">
              {rows.map((p) => (
                <li key={p.id} className="grid gap-0.5 py-2">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">{money(p)}</span>
                    <Badge tone={STATUS[p.status].tone} shape={p.status === "succeeded" ? "tint" : "outline"}>
                      {STATUS[p.status].label}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">
                    {p.paid_at ? `${orderDateTime(p.paid_at)}${p.how ? ` · ${HOW[p.how]}` : ""}` : `QR made ${orderDateTime(p.created_at)}`}
                  </span>
                  {p.reference ? <span className="truncate font-mono text-xs text-muted-foreground" title={p.reference}>Ref {p.reference.slice(0, 12)}…</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{order.payment_status === "succeeded" ? "Paid" : "Waiting for payment"}</p>
          )}
          {waiting ? (
            isAdmin ? (
              <Button variant="outline" onClick={() => setMarking(true)} className="mt-1 w-fit">
                <BadgeCheck aria-hidden="true" /> Mark as paid
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for the customer to pay. Only admins can mark it as paid by hand.</p>
            )
          ) : null}
        </>
      )}
      {marking ? <MarkPaidDialog order={order} onClose={() => setMarking(false)} /> : null}
    </section>
  );
}
