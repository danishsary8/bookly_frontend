import { Banknote, CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 2. Cash on delivery is the only method the API accepts today;
 * card and Bakong KHQR are listed as coming soon (owner decision: payments
 * start when the provider keys are ready).
 */
const methods = [
  { id: "cod", label: "cod", detail: "codDetail", Icon: Banknote, available: true },
  { id: "card", label: "card", detail: "cardDetail", Icon: CreditCard, available: false },
  { id: "khqr", label: "khqr", detail: "khqrDetail", Icon: QrCode, available: false },
] as const;

export function PaymentOptions() {
  const { dict } = useT();
  const k = dict.checkoutPage;
  return (
    <fieldset className="grid gap-3">
      <legend className="sr-only">{k.paymentMethod}</legend>
      {methods.map(({ id, label, detail, Icon, available }) => (
        <label
          key={id}
          className={cn(
            "flex items-center gap-4 rounded-xl border bg-card p-4",
            available ? "cursor-pointer border-primary bg-lapis-tint" : "cursor-not-allowed border-border opacity-60",
          )}
        >
          <input type="radio" name="payment" value={id} checked={available} disabled={!available} readOnly className="size-[18px] shrink-0 accent-primary" />
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="grid">
            <span className="font-semibold">{k[label]}</span>
            <span className="text-sm text-muted-foreground">{k[detail]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
