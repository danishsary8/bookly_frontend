import { FaMoneyBillWave } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 2. Cash on delivery always; Bakong KHQR when the API lists it in /delivery/options
 * `payment_methods` (KHQR payments design, owner 2026-11-02: test mode on the portfolio site). Compact rows (2026-11-26); card payments are not shown until they exist.
 * Without the list (an older API) only cash on delivery is offered, as before. KHQR shows its saving (owner 2026-11-12)
 * as a green tag; cash on delivery is switched off with the reason when the order is over the shop's limit.
 */
export type PaymentChoice = "cod" | "khqr";

export function PaymentOptions({
  value,
  onChange,
  khqr,
  khqrSaving,
  codBlocked,
}: {
  value: PaymentChoice;
  onChange: (next: PaymentChoice) => void;
  /** null = the API does not offer KHQR. */
  khqr: { mode?: string; pay_minutes?: number } | null;
  /** "Save $0.60": what paying by KHQR takes off this order (owner 2026-11-12); null = no KHQR discount. */
  khqrSaving?: string | null;
  /** Why cash on delivery can't be used for this order (over the shop's limit); null = it can. */
  codBlocked?: string | null;
}) {
  const { dict } = useT();
  const k = dict.checkoutPage;
  const methods = [
    { id: "cod", label: k.cod, detail: codBlocked ?? k.codDetail, available: !codBlocked },
    {
      id: "khqr",
      label: k.khqr,
      detail: khqr ? `${k.khqrReady(khqr.pay_minutes ?? 15)}${khqr.mode === "test" ? ` ${k.khqrTestNote}` : ""}` : k.khqrDetail,
      available: Boolean(khqr),
    },
  ] as const;

  return (
    <fieldset className="checkout-payments grid gap-2">
      <legend className="sr-only">{k.paymentMethod}</legend>
      {methods.map(({ id, label, detail, available }) => {
        const checked = available && value === id;
        const saving = id === "khqr" && available && khqrSaving ? khqrSaving : null;
        return (
          <label
            key={id}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
              !available && "cursor-not-allowed border-dashed border-border bg-transparent",
              available && (checked ? "cursor-pointer border-primary bg-lapis-tint/40" : "cursor-pointer border-border hover:border-primary/40"),
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
            <span className={`payment-brand payment-brand-${id}`} aria-hidden="true">
              {id === "cod" ? (
                <span className="payment-cash-art"><FaMoneyBillWave /><span>$</span></span>
              ) : id === "khqr" ? (
                <img src="/images/payments/khqr.svg" alt="" width={166} height={40} />
              ) : null}
            </span>
            <span className="grid min-w-0 flex-1">
              <span className={cn("font-semibold", !available && "text-muted-foreground")}>{label}</span>
              {saving ? <span className="mt-0.5 justify-self-start rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-semibold text-success sm:hidden">{k.khqrSave(saving)}</span> : null}
              <span className={cn("text-sm", id === "cod" && codBlocked ? "text-foreground" : "text-muted-foreground")}>{detail}</span>
            </span>
            {saving ? (
              <span className="hidden shrink-0 self-start rounded-full bg-success-tint px-2.5 py-1 text-xs font-semibold text-success sm:inline">{k.khqrSave(saving)}</span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}
