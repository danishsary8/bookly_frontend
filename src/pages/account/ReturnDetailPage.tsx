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
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";
import { formatName, useT } from "@/i18n";

const WHAT_NEXT = {
  requested: "whatNextRequested",
  approved: "whatNextApproved",
  rejected: "whatNextRejected",
  refunded: "whatNextRefunded",
} as const;

/* /account/returns/:id: one return request with its books, refund, the shop's note, and Withdraw while it's still open. */
export default function ReturnDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const request = useQuery({ ...orderQueries.return(id), enabled: valid });
  const [confirm, setConfirm] = useState(false);
  const { dict, locale } = useT();
  const t = dict.returns;
  useDocumentTitle(valid ? t.number(id) : t.title);

  const withdraw = useMutation({
    mutationFn: () => ordersApi.withdrawReturn(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: orderKeys.return(id) });
      void queryClient.invalidateQueries({ queryKey: ["returns"] });
      if (request.data?.order_id) void queryClient.invalidateQueries({ queryKey: orderKeys.returnable(request.data.order_id) });
      toast.success({ title: t.withdrawn(id), description: t.withdrawnLead });
      navigate("/account/returns", { replace: true });
    },
    onError: (error) => {
      setConfirm(false);
      const apiError = ApiError.from(error);
      toast.error({ title: t.withdrawFailed, description: apiError.field("status") ?? apiError.message });
      void request.refetch();
    },
  });

  if (!valid || (request.isError && ApiError.from(request.error).kind === "not_found")) {
    return <NotFoundState what={dict.nouns.whatReturn} backTo="/account/returns" backLabel={t.seeAll} />;
  }
  if (request.isError) return <ErrorState error={request.error} onRetry={() => request.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!request.data) {
    return (
      <SkeletonGroup label={t.loadingOne} className="grid gap-4">
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
          <ArrowLeft className="size-4" aria-hidden="true" /> {t.allReturns}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="font-display text-[2.441rem] leading-[1.1]">{t.number(r.id ?? id)}</h1>
            <p className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <ReturnStatusBadge status={r.status} />
              <span>
                {t.fromOrder}{" "}
                <Link to={`/account/orders/${r.order_id}`} className="font-semibold tabular-nums text-primary underline-offset-4 hover:underline">
                  {r.order_number}
                </Link>{" "}
                · {t.requested(orderDate(r.requested_at, locale))}
                {r.resolved_at ? ` · ${t.answered(orderDate(r.resolved_at, locale))}` : ""}
              </span>
            </p>
          </div>
          {r.can_withdraw ? (
            <Button variant="outline" onClick={() => setConfirm(true)}>
              <Undo2 aria-hidden="true" /> {t.withdraw}
            </Button>
          ) : null}
        </div>
        {r.status && r.status in WHAT_NEXT ? <p className="max-w-2xl text-[15px]">{t[WHAT_NEXT[r.status as keyof typeof WHAT_NEXT]]}</p> : null}
      </div>

      {r.staff_note ? (
        <section aria-labelledby="staff-note" className="grid gap-2 rounded-xl border border-border bg-surface-2 p-5 sm:p-6">
          <h2 id="staff-note" className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-5 text-primary" aria-hidden="true" /> {t.shopNote}
          </h2>
          <p className="whitespace-pre-line">{r.staff_note}</p>
        </section>
      ) : null}

      <section aria-labelledby="return-items" className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 id="return-items" className="font-display text-[1.563rem] leading-tight">
          {t.booksToReturn}
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {(r.items ?? []).map((line) => (
            <li key={line.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{line.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {dict.orderParts.line(formatName(dict, line.format), line.quantity ?? 0, formatUsd(line.unit_price_usd))}
                </span>
                {line.reason ? <span className="mt-1 block text-sm">“{line.reason}”</span> : null}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatUsd(Number(line.unit_price_usd ?? 0) * (line.quantity ?? 0))}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 grid gap-3 border-t border-border pt-4">
          <div className="grid gap-1">
            <dt className="text-sm font-semibold text-muted-foreground">{t.yourReason}</dt>
            <dd className="whitespace-pre-line">{r.reason}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold">{r.is_refund_final ? t.refundedTitle : t.estimatedTitle}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{formatUsd(r.refund_amount_usd)}</dd>
          </div>
        </dl>
      </section>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t.withdrawTitle(r.id ?? id)}
        description={t.withdrawLead}
        confirmLabel={t.withdraw}
        cancelLabel={t.keepIt}
        loading={withdraw.isPending}
        onConfirm={() => withdraw.mutate()}
      />
    </div>
  );
}
