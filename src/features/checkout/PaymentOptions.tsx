import { Banknote, CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 2. Cash on delivery always; Bakong KHQR when the API lists it in /delivery/options
 * `payment_methods` (KHQR payments design, owner 2026-11-02: test mode on the portfolio site). Card stays "coming soon".
 * Without the list (an older API) only cash on delivery is offered, as before.
 */
export type PaymentChoice = "cod" | "khqr";

export function PaymentOptions({
  value,
  onChange,
  khqr,
}: {
  value: PaymentChoice;
  onChange: (next: PaymentChoice) => void;
  /** null = the API does not offer KHQR. */
  khqr: { mode?: string; pay_minutes?: number } | null;
}) {
  const { dict } = useT();
  const k = dict.checkoutPage;
  const methods = [
    { id: "cod", label: k.cod, detail: k.codDetail, Icon: Banknote, available: true },
    {
      id: "khqr",
      label: k.khqr,
      detail: khqr ? `${k.khqrReady(khqr.pay_minutes ?? 15)}${khqr.mode === "test" ? ` ${k.khqrTestNote}` : ""}` : k.khqrDetail,
      Icon: QrCode,
      available: Boolean(khqr),
    },
    { id: "card", label: k.card, detail: k.cardDetail, Icon: CreditCard, available: false },
  ] as const;

  return (
    <fieldset className="grid gap-3">
      <legend className="sr-only">{k.paymentMethod}</legend>
      {methods.map(({ id, label, detail, Icon, available }) => {
        const checked = available && value === id;
        return (
          <label
            key={id}
            className={cn(
              "flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors duration-150",
              !available && "cursor-not-allowed border-border opacity-60",
              available && (checked ? "cursor-pointer border-primary bg-lapis-tint" : "cursor-pointer border-border hover:border-primary/50"),
            )}
          >
            <input
              type="radio"
              name="payment"
              value={id}
              checked={checked}
              disabled={!available}
              onChange={() => (id === "cod" || id === "khqr") && onChange(id)}
              className="size-[18px] shrink-0 accent-primary"
            />
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="grid">
              <span className="font-semibold">{label}</span>
              <span className="text-sm text-muted-foreground">{detail}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
