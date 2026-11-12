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

export default function ReferralsPage() {
  const { dict } = useT(); const t = dict.credit; const client = useQueryClient();
  const flags = useQuery(shopFeaturesQuery()); const [page, setPage] = useState(1); const [status, setStatus] = useState("");
  const rows = useQuery({ queryKey: ["staff", "referrals", page, status], queryFn: () => staffCreditApi.referrals(page, status), enabled: flags.data?.referrals === true });
  const action = useMutation({ mutationFn: staffCreditApi.void, onSuccess: () => { void client.invalidateQueries({ queryKey: ["staff", "referrals"] }); } });
  return <AdminPage title={t.referrals} lead="Follow referrals, rewards and their progress.">
    {flags.isPending ? <p role="status">{t.loading}</p> : flags.isError ? <ErrorState error={flags.error} onRetry={() => flags.refetch()} /> : !flags.data?.referrals ? <p>{t.offReferral}</p> : <>
      {rows.data ? <dl className="grid gap-4 sm:grid-cols-3"><div className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{t.total}</dt><dd className="text-2xl font-semibold tabular-nums">{rows.data.stats.total}</dd></div><div className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{t.status.rewarded}</dt><dd className="text-2xl font-semibold tabular-nums">{formatUsd(rows.data.stats.credited_usd)}</dd></div><div className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{t.unrecovered}</dt><dd className="text-2xl font-semibold tabular-nums">{formatUsd(rows.data.stats.unrecovered_usd)}</dd></div></dl> : null}
      <SelectField label={t.history} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{dict.common.all}</option>{(["pending", "qualified", "rewarded", "void"] as const).map((value) => <option key={value} value={value}>{t.status[value]}</option>)}</SelectField>
      {rows.isPending ? <p role="status">{t.loading}</p> : null}{rows.isError ? <ErrorState error={rows.error} onRetry={() => rows.refetch()} /> : null}{action.isError ? <p role="alert" className="text-destructive">{ApiError.from(action.error).message}</p> : null}
      <ul className="grid gap-3">{rows.data?.data.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 desk-card rounded-xl border border-border bg-card p-4"><p>#{row.id} · {row.sharer_customer_id} → {row.friend_customer_id} · {t.status[row.status]} · {formatUsd(row.reward_cents / 100)}</p>{row.status !== "void" ? <Button variant="outline" disabled={action.isPending} onClick={() => { if (window.confirm(t.confirmVoid)) action.mutate(row.id); }}>{t.void}</Button> : null}</li>)}</ul>
      <div className="flex gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button><Button variant="outline" disabled={page >= (rows.data?.last_page ?? 1)} onClick={() => setPage(page + 1)}>{t.next}</Button></div>
    </>}
  </AdminPage>;
}
