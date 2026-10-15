import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, WalletCards } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { opsApi, opsKeys, opsQueries, type StaffReturn } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { ReturnStatusBadge } from "@/components/orders/ReturnStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { orderDate, orderDateTime } from "@/features/orders/format";
import { formatLabel } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

type Action = "approve" | "reject" | "refund";

const ACTIONS: Record<Action, { label: string; Icon: typeof Ban; detail: (r: StaffReturn) => string; done: string; noteRequired: boolean; destructive?: boolean }> = {
  approve: {
    label: "Approve",
    Icon: CheckCircle2,
    detail: () => "The customer is told the return is accepted. Refund it once the books are back and checked.",
    done: "Return approved",
    noteRequired: false,
  },
  reject: {
    label: "Don't accept",
    Icon: Ban,
    detail: () => "The customer sees your reason on the return, so explain it plainly.",
    done: "Return not accepted",
    noteRequired: true,
    destructive: true,
  },
  refund: {
    label: "Record refund",
    Icon: WalletCards,
    detail: (r) => `Records a refund of ${formatUsd(r.refund_amount_usd)} and puts the books back into stock. Choose store credit or manual offline refund. When every book of the order is refunded, the order becomes Returned.`,
    done: "Refund recorded",
    noteRequired: false,
  },
};

function ActionDialog({ item, action, onClose }: { item: StaffReturn; action: Action; onClose: () => void }) {
  const queryClient = useQueryClient();
  const a = ACTIONS[action];
  const [method, setMethod] = useState<"store_credit" | "manual_offline">("store_credit");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: () => {
      if (action === "approve") return opsApi.approveReturn(item.id!, note.trim() || undefined);
      if (action === "reject") return opsApi.rejectReturn(item.id!, note.trim());
      return opsApi.refundReturn(item.id!, {
        method,
        reference: method === "manual_offline" ? reference.trim() : undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(opsKeys.return(item.id!), saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "returns"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
      toast.success({ title: a.done, description: `Return #${item.id}` });
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("reference") ?? apiError.field("note") ?? apiError.field("status") ?? apiError.message);
      void queryClient.invalidateQueries({ queryKey: opsKeys.return(item.id!) });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (a.noteRequired && !note.trim()) return setError("Write the reason the customer will see.");
    if (action === "refund" && method === "manual_offline" && !reference.trim()) {
      return setError("Payment reference is required for manual / offline refunds.");
    }
    setError(null);
    run.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !run.isPending && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {a.label} return #{item.id}?
            </DialogTitle>
            <DialogDescription>{a.detail(item)}</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={error} /> : null}

          {action === "refund" ? (
            <>
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
                <div className="flex items-baseline justify-between font-semibold">
                  <span>Calculated refund amount:</span>
                  <span className="text-lg tabular-nums text-primary">{formatUsd(item.refund_amount_usd)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {method === "store_credit"
                    ? "Generates a unique CREDIT-XXXX-XXXX coupon code valid for 1 year, bound to the customer account."
                    : "Pay the customer back outside the system (cash or bank transfer) and record the reference."}
                </p>
              </div>

              <SelectField
                label="Refund method"
                value={method}
                onChange={(e) => setMethod(e.target.value as "store_credit" | "manual_offline")}
              >
                <option value="store_credit">Store credit (auto-generates bound coupon)</option>
                <option value="manual_offline">Manual / offline (cash, ABA QR, bank transfer)</option>
              </SelectField>

              {method === "manual_offline" ? (
                <TextField
                  label="Payment reference / receipt"
                  placeholder="e.g. ABA transaction ref or receipt number"
                  hint="Required: record the payment reference or slip number."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                />
              ) : null}
            </>
          ) : null}

          <TextAreaField
            label={a.noteRequired ? "Reason" : "Note for the customer"}
            optional={!a.noteRequired}
            hint="Shown to the customer on their return. Up to 1,000 characters."
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={run.isPending}>
                Back
              </Button>
            </DialogClose>
            <Button type="submit" variant={a.destructive ? "destructive" : "default"} loading={run.isPending}>
              {a.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/*
 * /admin/returns/:id: what the customer wants to send back and why, then the
 * next step: requested → approve or don't accept; approved → refund (restocks)
 * or don't accept.
 */
export default function ReturnAdminPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const item = useQuery({ ...opsQueries.return(id), enabled: valid });
  const [action, setAction] = useState<Action | null>(null);
  const back = (
    <Link to="/admin/returns" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> All returns
    </Link>
  );

  if (!valid || (item.isError && ApiError.from(item.error).kind === "not_found")) return <NotFoundState what="return" backTo="/admin/returns" backLabel="All returns" />;
  if (item.isError) return <ErrorState error={item.error} onRetry={() => item.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!item.data)
    return (
      <SkeletonGroup label="Loading return…" className="mx-auto grid w-full max-w-[1200px] gap-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-64 rounded-xl" />
      </SkeletonGroup>
    );

  const r = item.data;
  const available: Action[] = r.status === "requested" ? ["approve", "reject"] : r.status === "approved" ? ["refund", "reject"] : [];

  return (
    <AdminPage
      title={`Return #${r.id}`}
      back={back}
      lead={
        <span className="flex flex-wrap items-center gap-2">
          <ReturnStatusBadge status={r.status} />
          {r.status === "refunded" && r.refund_method ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-success-tint px-2 py-0.5 text-xs font-semibold text-success">
              Refunded ({formatUsd(r.refund_amount_usd)} via {r.refund_method === "store_credit" ? "Store Credit" : "Manual / Offline"}
              {r.refund_reference ? ` - ${r.refund_reference}` : ""})
            </span>
          ) : null}
          Order
          <Link to={`/admin/orders/${r.order_id}`} className="font-semibold tabular-nums text-primary underline-offset-4 hover:underline">
            {r.order_number}
          </Link>
          · requested {orderDate(r.requested_at)}
        </span>
      }
      actions={available.map((key) => {
        const { label, Icon, destructive } = ACTIONS[key];
        return (
          <Button
            key={key}
            variant={destructive ? "outline" : "default"}
            onClick={() => setAction(key)}
            className={destructive ? "border-destructive/50 text-destructive hover:bg-destructive-tint" : undefined}
          >
            <Icon aria-hidden="true" /> {label}
          </Button>
        );
      })}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="return-books" className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
          <h2 id="return-books" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
            Books to return
          </h2>
          <ul className="divide-y divide-border">
            {(r.items ?? []).map((line) => (
              <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{line.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {formatLabel(line.format)} · Qty {line.quantity} × {formatUsd(line.unit_price_usd)}
                  </span>
                  {line.reason ? <span className="mt-1 block text-sm">“{line.reason}”</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-3 border-t border-border pt-4">
            <div className="grid gap-1">
              <dt className="text-sm font-semibold text-muted-foreground">Customer's reason</dt>
              <dd className="whitespace-pre-line">{r.reason}</dd>
            </div>
            {r.staff_note ? (
              <div className="grid gap-1">
                <dt className="text-sm font-semibold text-muted-foreground">Shop's note{r.handled_by ? ` (${r.handled_by.name})` : ""}</dt>
                <dd className="whitespace-pre-line">{r.staff_note}</dd>
              </div>
            ) : null}
            {r.status === "refunded" ? (
              <div className="grid gap-1 border-t border-border pt-3">
                <dt className="text-sm font-semibold text-muted-foreground">Refund record</dt>
                <dd className="text-sm">
                  <span className="font-semibold">
                    {r.refund_method === "store_credit" ? "Store Credit" : "Manual / Offline refund"}
                  </span>
                  {r.refund_reference ? (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      Ref: {r.refund_reference}
                    </span>
                  ) : null}
                  {r.refunded_by ? (
                    <span className="ml-2 text-xs text-muted-foreground">by {r.refunded_by.name}</span>
                  ) : null}
                  {r.refunded_at ? (
                    <span className="ml-2 text-xs text-muted-foreground">on {orderDate(r.refunded_at)}</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold">{r.is_refund_final ? "Refunded" : "Refund if accepted"}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatUsd(r.refund_amount_usd)}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="return-customer" className="grid content-start gap-2 rounded-xl border border-border bg-card p-5">
          <h2 id="return-customer" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
            Customer
          </h2>
          {r.customer ? (
            <>
              <Link to={`/admin/customers/${r.customer.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                {r.customer.name}
              </Link>
              <p className="text-[15px] text-muted-foreground">{r.customer.email}</p>
              {r.customer.phone ? <p className="text-[15px] tabular-nums text-muted-foreground">{r.customer.phone}</p> : null}
            </>
          ) : null}
          {r.resolved_at ? <p className="mt-2 text-sm text-muted-foreground">Answered {orderDateTime(r.resolved_at)}</p> : null}
        </section>
      </div>
      {action ? <ActionDialog key={action} item={r} action={action} onClose={() => setAction(null)} /> : null}
    </AdminPage>
  );
}
