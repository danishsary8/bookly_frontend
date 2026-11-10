import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/StatusPanel";
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

  if (status === "loading") return <StatusPanel tone="loading" title={t.stopping} />;
  return (
    <StatusPanel
      tone={status === "done" ? "success" : "error"}
      title={t.stopTitle}
      actions={
        <>
          <Button asChild>
            <Link to="/">{t.backHome}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/profile">{t.turnBackOn}</Link>
          </Button>
        </>
      }
    >
      <p>{status === "done" ? t.stopDone : t.stopInvalid}</p>
    </StatusPanel>
  );
}
