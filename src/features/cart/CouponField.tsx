import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, TicketPercent, X } from "lucide-react";
import { cartApi } from "@/api/endpoints/cart";
import { ApiError } from "@/api/errors";
import type { CouponCheck } from "@/api/types";
import { Button } from "@/components/ui/button";
import { formatMoney, useCurrency } from "@/stores/currency";
import { getCoupon, setCoupon, useCoupon } from "./couponStore";

/*
 * Coupon entry on the cart page. "Apply" checks the code against the current cart
 * (POST /cart/coupon/check); a valid code is remembered for checkout and shows
 * the discount. The cart page re-checks when the cart changes (`cartVersion`).
 */
export function CouponField({ cartVersion, onChecked }: { cartVersion: string; onChecked: (check: CouponCheck | null) => void }) {
  const currency = useCurrency();
  const saved = useCoupon();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const check = useMutation({
    mutationFn: (code: string) => cartApi.checkCoupon(code),
    onSuccess: (result) => {
      setCoupon(result.code ?? null);
      setError(null);
      onChecked(result);
    },
    onError: (err, code) => {
      const apiError = ApiError.from(err);
      const reason = apiError.field("code") ?? apiError.message;
      if (code === getCoupon()) {
        // A coupon applied earlier no longer fits the cart (e.g. below its minimum): forget it so
        // checkout doesn't send it, keep the code in the field, and say why.
        setCoupon(null);
        setDraft(code);
        setError(`${code} no longer applies: ${reason}`);
      } else {
        setError(reason);
      }
      onChecked(null);
    },
  });

  // Re-check a remembered coupon whenever the cart's contents change (minimums, eligibility).
  const { mutate } = check;
  useEffect(() => {
    if (saved) mutate(saved);
  }, [saved, cartVersion, mutate]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = draft.trim();
    if (!code) return setError("Enter a coupon code.");
    check.mutate(code);
  };

  const remove = () => {
    setCoupon(null);
    setDraft("");
    setError(null);
    onChecked(null);
  };

  if (saved && check.isPending && !check.data) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-muted-foreground" role="status">
        <TicketPercent className="size-[18px]" aria-hidden="true" /> Checking {saved}…
      </p>
    );
  }

  if (saved && check.data && !error) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-success-tint px-3 py-2.5 text-sm text-success" role="status">
        <span className="flex items-center gap-2">
          <TicketPercent className="size-[18px]" aria-hidden="true" />
          <span>
            <span className="font-bold uppercase tracking-wide">{check.data.code}</span> applied · −{formatMoney(check.data.discount_usd, check.data.discount_khr, currency)}
          </span>
        </span>
        <Button variant="ghost" size="icon-sm" onClick={remove} aria-label={`Remove coupon ${check.data.code}`} className="text-success hover:bg-card">
          <X aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-1.5">
      <label htmlFor="coupon-code" className="text-sm font-semibold">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={50}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "coupon-error" : undefined}
          placeholder="e.g. WELCOME10"
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
        />
        <Button type="submit" variant="outline" loading={check.isPending}>
          Apply
        </Button>
      </div>
      {error ? (
        <p id="coupon-error" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </form>
  );
}
