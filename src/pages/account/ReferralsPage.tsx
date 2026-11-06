import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { creditApi, shopFeaturesQuery } from "@/api/endpoints/credit";
import { TextField } from "@/components/form/Field";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { referralDevice } from "@/features/account/referralAttribution";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

export default function ReferralsPage() {
  const { dict } = useT(); const t = dict.credit;
  useDocumentTitle(t.referrals);
  const flags = useQuery(shopFeaturesQuery());
  const [page, setPage] = useState(1);
  const [copyResult, setCopyResult] = useState("");
  const referral = useQuery({ queryKey: ["referrals", page], queryFn: () => creditApi.referrals(referralDevice(), page), enabled: flags.data?.referrals === true, retry: false });
  if (flags.isPending) return <p role="status">{t.loading}</p>;
  if (!flags.data?.referrals) return <Navigate to="/account" replace />;
  const data = referral.data;
  const link = data ? `${window.location.origin}/?ref=${encodeURIComponent(data.code)}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopyResult(t.copied); } catch { setCopyResult(t.copyFailed); } };
  return <div className="grid gap-5">
    <h1 className="font-display text-3xl">{t.referrals}</h1>
    {referral.isError ? <ErrorState error={referral.error} onRetry={() => referral.refetch()} /> : null}
    {referral.isPending ? <p role="status">{t.loading}</p> : null}
    {data ? <><p>{t.referralLead(data.friend_discount_usd, data.reward_usd)}</p><p className="text-sm text-muted-foreground">{t.referralRules}</p>
      <p>{t.balance}: <strong>{formatUsd(data.balance_usd)}</strong></p>
      <TextField label={t.link} readOnly value={link} onFocus={(e) => e.target.select()} />
      <div className="flex flex-wrap gap-3"><Button onClick={() => void copy()}>{t.copy}</Button>
        <a className={buttonVariants({ variant: "outline" })} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        <a className={buttonVariants({ variant: "outline" })} href={`https://t.me/share/url?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">Telegram</a></div>
      {copyResult ? <p role="status">{copyResult}</p> : null}
      <h2 className="font-display text-2xl">{t.history}</h2>
      {data.history.length === 0 ? <p>{t.noReferrals}</p> : null}
      <ul className="grid gap-3">{data.history.map((row) => <li key={row.id} className="rounded-xl border border-border bg-card p-4">#{row.id} · {t.status[row.status]} · {formatUsd(row.reward_cents / 100)}</li>)}</ul>
      <div className="flex gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button><Button variant="outline" disabled={page >= data.last_page} onClick={() => setPage(page + 1)}>{t.next}</Button></div>
    </> : null}
  </div>;
}
