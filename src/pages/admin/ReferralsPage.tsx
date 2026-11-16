import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shopFeaturesQuery } from "@/api/endpoints/credit";
import { staffCreditApi } from "@/api/endpoints/staffCredit";
import { ApiError } from "@/api/errors";
import { SelectField } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AdminPage } from "@/features/admin/AdminPage";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";
import { Link } from "react-router-dom";
import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { FeatureUnavailable } from "@/features/admin/FeatureUnavailable";

export default function ReferralsPage() {
  const { dict } = useT(); const t = dict.credit; const client = useQueryClient();
  const flags = useQuery(shopFeaturesQuery()); const [page, setPage] = useState(1); const [status, setStatus] = useState("");
  const [voidId, setVoidId] = useState<number | null>(null);
  const rows = useQuery({ queryKey: ["staff", "referrals", page, status], queryFn: () => staffCreditApi.referrals(page, status), enabled: flags.data?.referrals === true });
  const action = useMutation({ mutationFn: staffCreditApi.void, onSuccess: () => { setVoidId(null); void client.invalidateQueries({ queryKey: ["staff", "referrals"] }); } });
  return <AdminPage title={t.referrals} lead="Follow referrals, rewards and their progress.">
    {flags.isPending ? <p role="status">{t.loading}</p> : flags.isError ? <ErrorState error={flags.error} onRetry={() => flags.refetch()} /> : !flags.data?.referrals ? <FeatureUnavailable icon={UsersRound} title="Referrals are unavailable" description="Referral rewards are currently turned off for this shop. Referral progress and reward records will appear here when the feature is available." /> : <>
      {rows.data ? <dl className="grid gap-4 sm:grid-cols-3"><div className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{t.total}</dt><dd className="text-2xl font-semibold tabular-nums">{rows.data.stats.total}</dd></div><div className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{t.status.rewarded}</dt><dd className="text-2xl font-semibold tabular-nums">{formatUsd(rows.data.stats.credited_usd)}</dd></div><div className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{t.unrecovered}</dt><dd className="text-2xl font-semibold tabular-nums">{formatUsd(rows.data.stats.unrecovered_usd)}</dd></div></dl> : null}
      <div className="work-toolbar"><SelectField containerClassName="w-full sm:max-w-xs" label={t.history} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{dict.common.all}</option>{(["pending", "qualified", "rewarded", "void"] as const).map((value) => <option key={value} value={value}>{t.status[value]}</option>)}</SelectField><p className="text-sm text-muted-foreground">Open a customer or order to follow the referral. Voiding a referral requires confirmation.</p></div>
      {rows.isPending ? <p role="status">{t.loading}</p> : null}{rows.isError ? <ErrorState error={rows.error} onRetry={() => rows.refetch()} /> : null}{action.isError ? <p role="alert" className="text-destructive">{ApiError.from(action.error).message}</p> : null}
      {rows.data && !rows.data.data.length ? <EmptyState icon={UsersRound} title="No referrals match" description="Try another status. New referral activity will appear here." /> : null}
      <ul className="grid gap-3">{rows.data?.data.map((row) => <li key={row.id} className="admin-record"><div className="admin-record-header"><h2 className="font-semibold">Referral #{row.id}</h2><Badge tone={row.status === "rewarded" ? "success" : "neutral"}>{t.status[row.status]}</Badge></div><dl><div><dt>Shared by</dt><dd><Link className="text-primary underline" to={`/admin/customers/${row.sharer_customer_id}`}>Customer #{row.sharer_customer_id}</Link></dd></div><div><dt>Friend</dt><dd>{row.friend_customer_id ? <Link className="text-primary underline" to={`/admin/customers/${row.friend_customer_id}`}>Customer #{row.friend_customer_id}</Link> : "Not joined yet"}</dd></div><div><dt>Reward</dt><dd>{formatUsd(row.reward_cents / 100)}</dd></div><div><dt>Unrecovered credit</dt><dd>{formatUsd(row.unrecovered_cents / 100)}</dd></div></dl><div className="admin-record-actions">{row.order_id ? <Link className="inline-flex min-h-11 items-center text-primary underline" to={`/admin/orders/${row.order_id}`}>View order #{row.order_id}</Link> : null}{row.status !== "void" ? <Button variant="outline" disabled={action.isPending} onClick={() => { action.reset(); setVoidId(row.id); }}>{t.void}</Button> : null}</div></li>)}</ul>
      <div className="work-pagination"><span>Page {page} of {rows.data?.last_page ?? 1}</span><div><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button><Button variant="outline" disabled={page >= (rows.data?.last_page ?? 1)} onClick={() => setPage(page + 1)}>{t.next}</Button></div></div>
      <ConfirmDialog open={voidId !== null} onOpenChange={(open) => { if (!open && !action.isPending) setVoidId(null); }} title={`Void referral #${voidId}?`} description={<span className="grid gap-2"><span>{t.confirmVoid}</span>{action.isError ? <span role="alert" className="text-destructive">{ApiError.from(action.error).message}</span> : null}</span>} confirmLabel={t.void} loading={action.isPending} onConfirm={() => { if (voidId !== null) action.mutate(voidId); }} />
    </>}
  </AdminPage>;
}
