import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { accountApi } from "@/api/endpoints/account";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

/**
 * The "Stop cart reminder emails" link in a cart reminder: /email/cart-reminders/stop?customer=…&token=…
 * Works without signing in (the token is the proof); turning them back on is in Account → Profile.
 */
export default function CartReminderStopPage() {
  const { dict } = useT();
  const t = dict.cartReminder;
  const [params] = useSearchParams();
  const customer = Number(params.get("customer"));
  const token = params.get("token") ?? "";
  const valid = Number.isInteger(customer) && customer > 0 && token !== "";
  const [status, setStatus] = useState<"loading" | "done" | "error">(valid ? "loading" : "error");
  const called = useRef(false);

  useEffect(() => {
    if (!valid || called.current) return;
    called.current = true;
    accountApi.stopCartReminders(customer, token).then(
      () => setStatus("done"),
      () => setStatus("error"),
    );
  }, [valid, customer, token]);

  return (
    <div className="container-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center sm:p-8" aria-live="polite">
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
            <h1 className="font-display text-2xl">{t.stopping}</h1>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className={
                status === "done"
                  ? "flex size-12 items-center justify-center rounded-full bg-success-tint text-success"
                  : "flex size-12 items-center justify-center rounded-full bg-destructive-tint text-destructive"
              }
            >
              {status === "done" ? <CheckCircle2 className="size-7" aria-hidden="true" /> : <AlertCircle className="size-7" aria-hidden="true" />}
            </div>
            <h1 className="font-display text-2xl">{t.stopTitle}</h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{status === "done" ? t.stopDone : t.stopInvalid}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/">{t.backHome}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/account/profile">{t.turnBackOn}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
