import { useCallback, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { newIdempotencyKey } from "@/api/client";
import { creditApi, shopFeaturesQuery, type GiftPurchaseInput } from "@/api/endpoints/credit";
import { ApiError } from "@/api/errors";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { TextAreaField, TextField } from "@/components/form/Field";
import { Gift } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AccountSection } from "@/features/account/AccountSection";
import { GiftCardPayment } from "@/features/account/GiftCardPayment";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";

export default function GiftCardsPage() {
  const session = useSession<Customer>("customer");
  return <GiftCardsContent key={session?.user.id} customerId={session?.user.id} />;
}

function GiftCardsContent({ customerId }: { customerId: number | undefined }) {
  const { dict } = useT();
  const t = dict.credit;
  useDocumentTitle(t.gifts);
  const flags = useQuery(shopFeaturesQuery());
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [amount, setAmount] = useState("10.00");
  const [code, setCode] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const purchases = useQuery({ queryKey: ["account", "gift-purchases", customerId, page], queryFn: () => creditApi.purchases(page), enabled: flags.data?.gift_cards === true });
  const refresh = useCallback(() => { void client.invalidateQueries({ queryKey: ["account", "gift-purchases"] }); void client.invalidateQueries({ queryKey: ["cart", "preview"] }); }, [client]);
  const buy = useMutation({ mutationFn: (input: GiftPurchaseInput) => creditApi.buy(input, key.current), onSuccess: (card) => { key.current = newIdempotencyKey(); setPaymentId(card.id); refresh(); } });
  const redeem = useMutation({ mutationFn: () => creditApi.redeem(code), onSuccess: () => { setCode(""); refresh(); } });
  const reveal = useMutation({ mutationFn: creditApi.reveal, onSuccess: (value) => { setShown(value); refresh(); } });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    buy.mutate({ amount_usd: amount, recipient_name: String(form.get("name")), recipient_email: String(form.get("email")), message: String(form.get("message")) || null, send_on: String(form.get("send_on")) });
  };
  if (flags.isPending) return <p role="status">{t.loading}</p>;
  if (flags.isError) return <ErrorState error={flags.error} onRetry={() => flags.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!flags.data?.gift_cards) return <Navigate to="/account" replace />;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Phnom_Penh" }).format(new Date());
  const latest = new Date(`${today}T00:00:00Z`); latest.setUTCDate(latest.getUTCDate() + 90);
  return <AccountSection title={t.gifts} lead={purchases.data ? <p className="text-lg">{t.balance}: <strong className="font-display text-2xl text-foreground">{formatUsd(purchases.data.balance_usd)}</strong></p> : undefined}>
    <section className="grid gap-4 shop-card rounded-2xl border border-border bg-card p-5" aria-labelledby="redeem-title">
      <h2 id="redeem-title" className="font-display text-2xl">{t.redeem}</h2>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); redeem.mutate(); }}>
        <TextField label={t.code} required maxLength={64} autoComplete="off" spellCheck={false} value={code} onChange={(e) => { setCode(e.target.value); redeem.reset(); }} />
        <Button type="submit" loading={redeem.isPending}>{t.redeem}</Button>
        {redeem.isError ? <p role="alert" className="text-destructive">{ApiError.from(redeem.error).message}</p> : null}
        {redeem.isSuccess ? <p role="status">{t.redeemed}</p> : null}
      </form>
    </section>
    <section className="grid gap-4 shop-card rounded-2xl border border-border bg-card p-5" aria-labelledby="buy-title">
      <h2 id="buy-title" className="font-display text-2xl">{t.buy}</h2><p className="text-sm text-muted-foreground">{t.rules}</p>
      <form onSubmit={submit} className="grid gap-4">
        <fieldset disabled={buy.isPending} className="grid gap-4">
          <legend className="sr-only">{t.buy}</legend>
          <div className="flex flex-wrap gap-2">{[5, 10, 20, 50].map((value) => <Button key={value} type="button" variant="outline" aria-pressed={Number(amount) === value} onClick={() => setAmount(value.toFixed(2))}>{formatUsd(value)}</Button>)}</div>
          <TextField label={t.amount} type="number" min={5} max={200} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField label={t.recipient} name="name" required maxLength={120} autoComplete="off" />
          <TextField label={t.email} name="email" type="email" required maxLength={190} autoComplete="off" />
          <TextAreaField label={t.message} name="message" maxLength={300} optional />
          <TextField label={t.sendOn} name="send_on" type="date" required min={today} max={latest.toISOString().slice(0, 10)} defaultValue={today} />
        </fieldset>
        {buy.isError ? <p role="alert" className="text-destructive">{ApiError.from(buy.error).message}</p> : null}
        <Button type="submit" loading={buy.isPending}>{t.pay}</Button>
      </form>
    </section>
    {paymentId ? <GiftCardPayment id={paymentId} onPaid={refresh} /> : null}
    {shown ? <div role="status" className="grid gap-2 shop-card rounded-2xl border border-border bg-card p-5"><p>{t.revealHint}</p><code className="break-all text-xl font-bold">{shown}</code></div> : null}
    {reveal.isError ? <p role="alert" className="text-destructive">{ApiError.from(reveal.error).message}</p> : null}
    <section aria-labelledby="purchases-title" className="grid gap-4">
      <h2 id="purchases-title" className="font-display text-2xl">{t.purchases}</h2>
      {purchases.isError ? <ErrorState error={purchases.error} onRetry={() => purchases.refetch()} /> : null}
      {purchases.isPending ? <p role="status">{t.loading}</p> : null}
      {purchases.data?.data.length === 0 ? <EmptyState icon={Gift} headingLevel="h3" title={dict.accountEmpty.giftsTitle} description={dict.accountEmpty.giftsLead} action={<a href="#buy-title" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{dict.accountEmpty.buyGift}</a>} className="py-6" /> : null}
      <ul className="grid gap-3">{purchases.data?.data.map((card) => <li key={card.id} className="grid gap-2 shop-card rounded-2xl border border-border bg-card p-4">
        <p className="break-words font-semibold">{card.recipient_name} · {formatUsd(card.amount_usd)} · ••••{card.last_four}</p>
        <p>{t.status[card.status]}</p><p>{t.sendOn}: {card.send_on}</p>
        {card.email_sent_at ? <p>{t.emailSent}</p> : null}{card.email_failed_at ? <p>{t.emailFailed}</p> : null}
        {card.status === "pending_payment" ? <Button variant="outline" onClick={() => setPaymentId(card.id)}>{t.check}</Button> : null}
        {card.can_reveal ? <Button variant="outline" disabled={reveal.isPending} onClick={() => reveal.mutate(card.id)}>{t.reveal}</Button> : null}
      </li>)}</ul>
      <div className="flex gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button><Button variant="outline" disabled={page >= (purchases.data?.last_page ?? 1)} onClick={() => setPage(page + 1)}>{t.next}</Button></div>
    </section>
  </AccountSection>;
}
