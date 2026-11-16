import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Gift, Eye, Send, Ban } from "lucide-react";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { staffCreditApi } from "@/api/endpoints/staffCredit";
import { ApiError } from "@/api/errors";
import { SelectField, TextField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminFormDialogContent } from "@/features/admin/AdminFormDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui/error-state";
import { AdminPage } from "@/features/admin/AdminPage";
import { FeatureUnavailable } from "@/features/admin/FeatureUnavailable";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

export default function GiftCardsPage() {
  const { dict } = useT(); const t = dict.credit;
  const client = useQueryClient(); const flags = useQuery(shopFeaturesQuery());
  const [params, setParams] = useState({ page: 1, last_four: "", buyer_id: "", status: "" });
  const [selected, setSelected] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; name: "cancel" | "resend" } | null>(null);
  const gifts = useQuery({ queryKey: ["staff", "gift-cards", params], queryFn: () => staffCreditApi.gifts(params), enabled: flags.data?.gift_cards === true });
  const detail = useQuery({ queryKey: ["staff", "gift-card", selected], queryFn: () => staffCreditApi.gift(selected!), enabled: selected !== null && flags.data?.gift_cards === true });
  const action = useMutation({ mutationFn: ({ id, name }: { id: number; name: "cancel" | "resend" }) => staffCreditApi.giftAction(id, name), onSuccess: () => { setConfirm(null); toast.success("Gift card updated"); void client.invalidateQueries({ queryKey: ["staff", "gift-cards"] }); void client.invalidateQueries({ queryKey: ["staff", "gift-card"] }); } });
  const filter = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); setParams({ page: 1, last_four: String(f.get("last_four") ?? ""), buyer_id: String(f.get("buyer_id") ?? ""), status: String(f.get("status") ?? "") }); };
  return <AdminPage title={t.gifts} lead="Track gift card purchases, balances and delivery.">
    {flags.isPending ? <p role="status">{t.loading}</p> : flags.isError ? <ErrorState error={flags.error} onRetry={() => flags.refetch()} /> : !flags.data?.gift_cards ? <FeatureUnavailable icon={Gift} title="Gift cards are unavailable" description="Gift card purchases are currently turned off for this shop. Purchases, balances and delivery tools will appear here when the feature is available." /> : <>
      <dl className="admin-summary">{gifts.data ? [[t.sold, gifts.data.totals.sold_usd], [t.redeemedTotal, gifts.data.totals.redeemed_usd], [t.outstanding, gifts.data.totals.outstanding_usd], [t.refundReview, gifts.data.totals.refund_review_usd]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatUsd(value)}</dd></div>) : null}</dl>
      <form onSubmit={filter} className="admin-filter-grid rounded-xl border border-border bg-card p-4"><TextField label={t.lastFour} name="last_four" minLength={4} maxLength={4} /><TextField label={t.buyer} name="buyer_id" type="number" min={1} /><SelectField label="Status" name="status"><option value="">{dict.common.all}</option>{(["pending_payment", "active", "redeemed", "cancelled", "expired"] as const).map((status) => <option key={status} value={status}>{t.status[status]}</option>)}</SelectField><Button type="submit">{t.filter}</Button></form>
      {gifts.isPending ? <p role="status">{t.loading}</p> : null}{gifts.isError ? <ErrorState error={gifts.error} onRetry={() => gifts.refetch()} /> : null}
      {action.isError ? <p role="alert" className="text-destructive">{ApiError.from(action.error).message}</p> : null}
      {gifts.data && !gifts.data.data.length ? <EmptyState icon={Gift} title="No gift cards match" description="Try another status, buyer or last four characters." /> : null}
      <ul className="grid gap-3">{gifts.data?.data.map((card) => <li key={card.id} className="admin-record"><div className="admin-record-header"><h2 className="font-semibold">Gift card #{card.id} · ••••{card.last_four ?? "—"}</h2><Badge tone={card.status === "active" ? "success" : "neutral"}>{t.status[card.status]}</Badge></div><dl><div><dt>Value</dt><dd>{formatUsd(card.amount_cents / 100)}</dd></div><div><dt>{t.buyer}</dt><dd><Link className="text-primary underline" to={`/admin/customers/${card.buyer_customer_id}`}>Customer #{card.buyer_customer_id}</Link></dd></div><div><dt>{t.recipient}</dt><dd>{card.recipient_name}</dd></div><div><dt>{t.sendOn}</dt><dd>{card.send_on}</dd></div></dl>
        <div className="admin-record-actions"><Button variant="outline" onClick={() => setSelected(card.id)}><Eye aria-hidden="true" />View details</Button>{["pending_payment", "active"].includes(card.status) ? <Button variant="ghost" disabled={action.isPending} onClick={() => { action.reset(); setConfirm({ id: card.id, name: "cancel" }); }}><Ban aria-hidden="true" />{t.cancel}</Button> : null}{card.status === "active" ? <Button variant="outline" disabled={action.isPending} onClick={() => { action.reset(); setConfirm({ id: card.id, name: "resend" }); }}><Send aria-hidden="true" />{t.resend}</Button> : null}</div>
        {card.email_failed_at ? <p className="text-sm text-destructive">{t.emailFailed}</p> : null}
      </li>)}</ul>
      <div className="work-pagination"><span>Page {params.page} of {gifts.data?.last_page ?? 1}</span><div><Button variant="outline" disabled={params.page <= 1} onClick={() => setParams({ ...params, page: params.page - 1 })}>{t.previous}</Button><Button variant="outline" disabled={params.page >= (gifts.data?.last_page ?? 1)} onClick={() => setParams({ ...params, page: params.page + 1 })}>{t.next}</Button></div></div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}><AdminFormDialogContent><DialogHeader><DialogTitle>{t.gifts} #{selected}</DialogTitle><DialogDescription>Recipient, delivery and purchase details.</DialogDescription></DialogHeader>{detail.isPending ? <p role="status">{t.loading}</p> : null}{detail.isError ? <ErrorState error={detail.error} onRetry={() => detail.refetch()} /> : null}{detail.data ? <dl className="admin-detail-fields">{[[t.recipient, detail.data.data.recipient_name], [t.email, detail.data.data.recipient_email], [t.message, detail.data.data.message || "—"], [t.sendOn, detail.data.data.send_on], [t.amount, formatUsd(detail.data.data.amount_cents / 100)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl> : null}<DialogFooter><DialogClose asChild><Button variant="outline">{dict.ui.close}</Button></DialogClose></DialogFooter></AdminFormDialogContent></Dialog>
      <ConfirmDialog open={confirm !== null} onOpenChange={(open) => { if (!open && !action.isPending) setConfirm(null); }} title={confirm?.name === "resend" ? `Resend gift card #${confirm.id}?` : `Cancel gift card #${confirm?.id}?`} description={<span className="grid gap-2"><span>{confirm?.name === "resend" ? t.confirmResend : t.confirmCancel}</span>{action.isError ? <span role="alert" className="text-destructive">{ApiError.from(action.error).message}</span> : null}</span>} confirmLabel={confirm?.name === "resend" ? t.resend : t.cancel} destructive={confirm?.name !== "resend"} loading={action.isPending} onConfirm={() => { if (confirm) action.mutate(confirm); }} />
    </>}
  </AdminPage>;
}
