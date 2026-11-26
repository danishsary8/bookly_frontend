import { FaMoneyBillWave } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Checkout step 2 (Payment).
 * - Cash on delivery (always, unless over the shop's COD limit)
 * - Bakong KHQR (when offered by /delivery/options, with optional saving badge)
 * - Credit / Debit Card (Visa & Mastercard) — displayed as a non-selectable "Coming soon" preview row.
 */
export type PaymentChoice = "cod" | "khqr";

/** Reusable visual payment brand tile (Cash banknote art or Bakong KHQR logo). */
export function PaymentBrandMark({ method, className }: { method: PaymentChoice; className?: string }) {
  return (
    <span className={cn(`payment-brand payment-brand-${method}`, className)} aria-hidden="true">
      {method === "cod" ? (
        <span className="payment-cash-art">
          <FaMoneyBillWave />
          <span>$</span>
        </span>
      ) : (
        <img src="/images/payments/khqr.svg" alt="" width={166} height={40} />
      )}
    </span>
  );
}

function CardBrandArt() {
  return (
    <span className="payment-card-brands" aria-hidden="true">
      {/* Crisp Visa mark */}
      <svg viewBox="0 0 54 18" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
        <path
          d="M21.2 1.2L17.3 16.8H13.1L17 1.2H21.2ZM36.7 11.2L38.9 5.2L40.1 11.2H36.7ZM41.3 16.8H45.1L41.8 1.2H38.3C37.5 1.2 36.8 1.7 36.5 2.4L30.4 16.8H34.7L35.6 14.4H40.8L41.3 16.8ZM30.6 11.7C30.6 7.5 24.8 7.3 24.8 5.4C24.8 4.8 25.4 4.2 26.6 4C27.2 3.9 28.9 3.9 30.8 4.8L31.5 1.4C30.5 1 29.2 0.7 27.6 0.7C23.5 0.7 20.6 2.9 20.6 6C20.6 8.3 22.7 9.6 24.3 10.4C25.9 11.2 26.5 11.7 26.5 12.4C26.5 13.5 25.2 14 24 14C21.9 14 20.7 13.4 19.7 13L18.9 16.5C19.9 17 21.8 17.4 23.7 17.4C28 17.4 30.6 15.3 30.6 11.7ZM14.5 1.2L7.8 16.8H3.4L0.2 4.3C0 3.5 -0.1 3.2 -0.8 2.8C-1.8 2.2 -3.4 1.7 -4.8 1.4L-4.7 1.2H2.2C3.1 1.2 3.9 1.8 4.1 2.8L5.8 11.8L10.1 1.2H14.5Z"
          transform="translate(5 0)"
          fill="#1434CB"
        />
      </svg>
      {/* Crisp Mastercard interlocking circles */}
      <svg viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
        <circle cx="13" cy="11" r="9.5" fill="#EB001B" />
        <circle cx="23" cy="11" r="9.5" fill="#F79E1B" />
        <path
          d="M18 3.68A9.48 9.48 0 0 0 14.35 11c0 3.04 1.43 5.75 3.65 7.32A9.48 9.48 0 0 0 21.65 11c0-3.04-1.43-5.75-3.65-7.32Z"
          fill="#FF5F00"
        />
      </svg>
    </span>
  );
}

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
    { id: "cod", label: k.cod, detail: codBlocked ?? k.codDetail, available: !codBlocked, comingSoon: false },
    {
      id: "khqr",
      label: k.khqr,
      detail: khqr ? `${k.khqrReady(khqr.pay_minutes ?? 15)}${khqr.mode === "test" ? ` ${k.khqrTestNote}` : ""}` : k.khqrDetail,
      available: Boolean(khqr),
      comingSoon: !khqr,
    },
    {
      id: "card",
      label: k.card,
      detail: k.cardDetail,
      available: false,
      comingSoon: true,
    },
  ] as const;

  return (
    <fieldset className="checkout-payments grid gap-2">
      <legend className="sr-only">{k.paymentMethod}</legend>
      {methods.map(({ id, label, detail, available, comingSoon }) => {
        const checked = available && value === id;
        const saving = id === "khqr" && available && khqrSaving ? khqrSaving : null;
        return (
          <label
            key={id}
            aria-disabled={!available || undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-[border-color,background-color] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
              !available && "cursor-not-allowed border-dashed border-border/90 bg-surface-1/40",
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
              className="size-[18px] shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className={cn(`payment-brand payment-brand-${id}`, !available && "opacity-85")} aria-hidden="true">
              {id === "cod" ? (
                <span className="payment-cash-art"><FaMoneyBillWave /><span>$</span></span>
              ) : id === "khqr" ? (
                <img src="/images/payments/khqr.svg" alt="" width={166} height={40} />
              ) : (
                <CardBrandArt />
              )}
            </span>
            <span className="grid min-w-0 flex-1">
              <span className={cn("font-semibold", !available && "text-muted-foreground")}>{label}</span>
              {saving ? (
                <span className="mt-0.5 justify-self-start rounded-full bg-success-tint px-2.5 py-0.5 text-xs font-semibold text-success sm:hidden">
                  {k.khqrSave(saving)}
                </span>
              ) : comingSoon ? (
                <span className="mt-0.5 justify-self-start rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground sm:hidden">
                  {k.comingSoon}
                </span>
              ) : null}
              <span className={cn("text-sm", id === "cod" && codBlocked ? "text-foreground" : "text-muted-foreground")}>{detail}</span>
            </span>
            {saving ? (
              <span className="hidden shrink-0 self-start rounded-full bg-success-tint px-2.5 py-1 text-xs font-semibold text-success sm:inline">
                {k.khqrSave(saving)}
              </span>
            ) : comingSoon ? (
              <span className="hidden shrink-0 self-start rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground sm:inline">
                {k.comingSoon}
              </span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}
