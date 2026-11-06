import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { staffCreditApi } from "@/api/endpoints/staffCredit";
import { ApiError } from "@/api/errors";
import { SelectField, TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { AdminPage } from "@/features/admin/AdminPage";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

export default function GiftCardsPage() {
  const { dict } = useT(); const t = dict.credit;
  const client = useQueryClient(); const flags = useQuery(shopFeaturesQuery());
  const [params, setParams] = useState({ page: 1, last_four: "", buyer_id: "", status: "" });
  const [selected, setSelected] = useState<number | null>(null);
  const gifts = useQuery({ queryKey: ["staff", "gift-cards", params], queryFn: () => staffCreditApi.gifts(params), enabled: flags.data?.gift_cards === true });
  const detail = useQuery({ queryKey: ["staff", "gift-card", selected], queryFn: () => staffCreditApi.gift(selected!), enabled: selected !== null && flags.data?.gift_cards === true });
  const action = useMutation({ mutationFn: ({ id, name }: { id: number; name: "cancel" | "resend" }) => staffCreditApi.giftAction(id, name), onSuccess: () => { void client.invalidateQueries({ queryKey: ["staff", "gift-cards"] }); void client.invalidateQueries({ queryKey: ["staff", "gift-card"] }); } });
  const filter = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); setParams({ page: 1, last_four: String(f.get("last_four")), buyer_id: String(f.get("buyer_id")), status: String(f.get("status")) }); };
  return <AdminPage title={t.gifts}>
    {flags.isPending ? <p role="status">{t.loading}</p> : flags.isError ? <ErrorState error={flags.error} onRetry={() => flags.refetch()} /> : !flags.data?.gift_cards ? <p>{t.offGift}</p> : <>
      <dl className="grid gap-4 sm:grid-cols-2">{gifts.data ? [[t.sold, gifts.data.totals.sold_usd], [t.redeemedTotal, gifts.data.totals.redeemed_usd], [t.outstanding, gifts.data.totals.outstanding_usd], [t.refundReview, gifts.data.totals.refund_review_usd]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-4"><dt>{label}</dt><dd className="mt-1 text-xl font-semibold">{formatUsd(value)}</dd></div>) : null}</dl>
      <form onSubmit={filter} className="grid items-end gap-3 sm:grid-cols-4"><TextField label={t.lastFour} name="last_four" minLength={4} maxLength={4} /><TextField label={t.buyer} name="buyer_id" type="number" min={1} /><SelectField label={dict.credit.total} name="status"><option value="">{dict.common.all}</option>{(["pending_payment", "active", "redeemed", "cancelled", "expired"] as const).map((status) => <option key={status} value={status}>{t.status[status]}</option>)}</SelectField><Button type="submit">{t.filter}</Button></form>
      {gifts.isPending ? <p role="status">{t.loading}</p> : null}{gifts.isError ? <ErrorState error={gifts.error} onRetry={() => gifts.refetch()} /> : null}
      {action.isError ? <p role="alert" className="text-destructive">{ApiError.from(action.error).message}</p> : null}
      <ul className="grid gap-3">{gifts.data?.data.map((card) => <li key={card.id} className="grid gap-3 rounded-xl border border-border bg-card p-4"><Button className="justify-start" variant="ghost" onClick={() => setSelected(card.id)}>#{card.id} · ••••{card.last_four} · {formatUsd(card.amount_cents / 100)}</Button><p>{t.buyer}: {card.buyer_customer_id} · {t.status[card.status]}</p>
        <div className="flex flex-wrap gap-3">{["pending_payment", "active"].includes(card.status) ? <Button variant="outline" disabled={action.isPending} onClick={() => { if (window.confirm(t.confirmCancel)) action.mutate({ id: card.id, name: "cancel" }); }}>{t.cancel}</Button> : null}{card.status === "active" ? <Button variant="outline" disabled={action.isPending} onClick={() => { if (window.confirm(t.confirmResend)) action.mutate({ id: card.id, name: "resend" }); }}>{t.resend}</Button> : null}</div>
        {card.email_failed_at ? <p>{t.emailFailed}</p> : null}
      </li>)}</ul>
      <div className="flex gap-3"><Button variant="outline" disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })}>{t.previous}</Button><Button variant="outline" disabled={params.page >= (gifts.data?.last_page ?? 1)} onClick={() => setParams({ ...params, page: params.page + 1 })}>{t.next}</Button></div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{t.gifts} #{selected}</DialogTitle></DialogHeader>{detail.isError ? <ErrorState error={detail.error} onRetry={() => detail.refetch()} /> : null}{detail.data ? <dl className="grid gap-3 break-words"><dt>{t.recipient}</dt><dd>{detail.data.data.recipient_name}</dd><dt>{t.email}</dt><dd>{detail.data.data.recipient_email}</dd><dt>{t.message}</dt><dd className="whitespace-pre-wrap">{detail.data.data.message}</dd><dt>{t.sendOn}</dt><dd>{detail.data.data.send_on}</dd><dt>{t.amount}</dt><dd>{formatUsd(detail.data.data.amount_cents / 100)}</dd></dl> : null}</DialogContent></Dialog>
    </>}
  </AdminPage>;
}
