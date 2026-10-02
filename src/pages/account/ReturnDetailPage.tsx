import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquareText, Undo2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { orderKeys, orderQueries, ordersApi } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { ReturnStatusBadge } from "@/components/orders/ReturnStatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatLabel } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const WHAT_NEXT: Record<string, string> = {
  requested: "The shop will look at your request soon. Keep the books in their packaging until then. You can still withdraw it.",
  approved: "Your return is approved. The refund follows once the shop has received and checked the books.",
  rejected: "The shop didn't accept this return. See their note for the reason, or contact us if you have questions.",
  refunded: "The refund for this return has been paid.",
};

/* /account/returns/:id: one return request with its books, refund, the shop's note, and Withdraw while it's still open. */
export default function ReturnDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const request = useQuery({ ...orderQueries.return(id), enabled: valid });
  const [confirm, setConfirm] = useState(false);
  useDocumentTitle(valid ? `Return #${id}` : "Return");

  const withdraw = useMutation({
    mutationFn: () => ordersApi.withdrawReturn(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: orderKeys.return(id) });
      void queryClient.invalidateQueries({ queryKey: ["returns"] });
      if (request.data?.order_id) void queryClient.invalidateQueries({ queryKey: orderKeys.returnable(request.data.order_id) });
      toast.success({ title: `Return #${id} withdrawn`, description: "You can ask again while the return window is open." });
      navigate("/account/returns", { replace: true });
    },
    onError: (error) => {
      setConfirm(false);
      const apiError = ApiError.from(error);
      toast.error({ title: "Couldn't withdraw the return", description: apiError.field("status") ?? apiError.message });
      void request.refetch();
    },
  });

  if (!valid || (request.isError && ApiError.from(request.error).kind === "not_found")) {
    return <NotFoundState what="return" backTo="/account/returns" backLabel="See all your returns" />;
  }
  if (request.isError) return <ErrorState error={request.error} onRetry={() => request.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!request.data) {
    return (
      <SkeletonGroup label="Loading your return…" className="grid gap-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-48 rounded-xl" />
      </SkeletonGroup>
    );
  }

  const r = request.data;
  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <Link to="/account/returns" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> All returns
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="font-display text-[2.441rem] leading-[1.1]">Return #{r.id}</h1>
            <p className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <ReturnStatusBadge status={r.status} />
              <span>
                From order{" "}
                <Link to={`/account/orders/${r.order_id}`} className="font-semibold tabular-nums text-primary underline-offset-4 hover:underline">
                  {r.order_number}
                </Link>{" "}
                · requested {orderDate(r.requested_at)}
                {r.resolved_at ? ` · answered ${orderDate(r.resolved_at)}` : ""}
              </span>
            </p>
          </div>
          {r.can_withdraw ? (
            <Button variant="outline" onClick={() => setConfirm(true)}>
              <Undo2 aria-hidden="true" /> Withdraw return
            </Button>
          ) : null}
        </div>
        {r.status && WHAT_NEXT[r.status] ? <p className="max-w-2xl text-[15px]">{WHAT_NEXT[r.status]}</p> : null}
      </div>

      {r.staff_note ? (
        <section aria-labelledby="staff-note" className="grid gap-2 rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
          <h2 id="staff-note" className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-5 text-primary" aria-hidden="true" /> Note from the shop
          </h2>
          <p className="whitespace-pre-line">{r.staff_note}</p>
        </section>
      ) : null}

      <section aria-labelledby="return-items" className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 id="return-items" className="font-display text-[1.563rem] leading-tight">
          Books to return
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {(r.items ?? []).map((line) => (
            <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{line.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {formatLabel(line.format)} · Qty {line.quantity} × {formatUsd(line.unit_price_usd)}
                </span>
                {line.reason ? <span className="mt-1 block text-sm">“{line.reason}”</span> : null}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatUsd(Number(line.unit_price_usd ?? 0) * (line.quantity ?? 0))}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 grid gap-3 border-t border-border pt-4">
          <div className="grid gap-1">
            <dt className="text-sm font-semibold text-muted-foreground">Your reason</dt>
            <dd className="whitespace-pre-line">{r.reason}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold">{r.is_refund_final ? "Refunded" : "Estimated refund"}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatUsd(r.refund_amount_usd)}</dd>
          </div>
        </dl>
      </section>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Withdraw return #${r.id}?`}
        description="The request is removed and the shop won't process it. You can ask again while the return window is open."
        confirmLabel="Withdraw return"
        cancelLabel="Keep it"
        loading={withdraw.isPending}
        onConfirm={() => withdraw.mutate()}
      />
    </div>
  );
}
