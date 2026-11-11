import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { creditApi } from "@/api/endpoints/credit";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useT } from "@/i18n";

export function GiftCardPayment({ id, onPaid }: { id: number; onPaid: () => void }) {
  const { dict } = useT();
  const t = dict.credit;
  const state = useQuery({ queryKey: ["account", "gift-payment", id], queryFn: () => creditApi.payment(id), refetchInterval: (q) => q.state.data?.data.status === "pending_payment" ? 5000 : false, retry: false });
  const [image, setImage] = useState("");
  const qr = state.data?.payment?.mode === "bakong" ? state.data.payment.qr_payload : null;
  useEffect(() => {
    let alive = true;
    if (qr) void QRCode.toDataURL(qr, { width: 280, margin: 2, errorCorrectionLevel: "M" }).then((url) => { if (alive) setImage(url); }).catch(() => { if (alive) setImage(""); });
    return () => { alive = false; };
  }, [qr]);
  const status = state.data?.data.status;
  useEffect(() => { if (status === "active") onPaid(); }, [status, onPaid]);
  return <div className="grid gap-3 shop-card rounded-2xl border border-border bg-card p-5" aria-live="polite">
    {state.isPending ? <p>{t.loading}</p> : null}
    {state.isError ? <ErrorState error={state.error} onRetry={() => state.refetch()} /> : null}
    {status ? <p className="font-semibold">{t.status[status]}</p> : null}
    {state.data?.payment?.mode === "test" ? <p>{t.test}</p> : null}
    {qr && image ? <img src={image} alt={t.qr} width={280} height={280} className="max-w-full rounded-lg" /> : null}
    {state.data?.payment?.mode === "bakong" ? <Button variant="outline" disabled={state.isFetching} onClick={() => void state.refetch()}>{t.check}</Button> : null}
  </div>;
}
