import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronDown, Loader2, Plus, TicketPercent, X } from "lucide-react";
import { cartApi } from "@/api/endpoints/cart";
import type { RewardCoupon } from "@/api/endpoints/rewards";
import { ApiError } from "@/api/errors";
import type { CouponCheck } from "@/api/types";
import { Button } from "@/components/ui/button";
import { percentLabel } from "@/features/offers/percent";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { getCoupon, setCoupon, useCoupon } from "./couponStore";
import { getDict, useT } from "@/i18n";

/*
 * Unified coupon control on the cart page:
 * - Shows any usable account reward coupons as one-tap ticket cards.
 * - Always lets the customer enter a different promo code manually (both before and after applying).
 * - Checks codes against the live cart (POST /cart/coupon/check) and re-checks when cart contents change.
 */
export function CouponField({
  cartVersion,
  onChecked,
  savedCoupons = [],
}: {
  cartVersion: string;
  onChecked: (check: CouponCheck | null) => void;
  savedCoupons?: RewardCoupon[];
}) {
  const currency = useCurrency();
  const saved = useCoupon();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inputOpen, setInputOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { dict } = useT();
  const c = dict.cartPage;

  const lastCheckedRef = useRef<string | null>(null);

  const check = useMutation({
    mutationFn: (code: string) => cartApi.checkCoupon(code),
    onSuccess: (result) => {
      const appliedCode = result.code ?? null;
      lastCheckedRef.current = appliedCode ? `${appliedCode}|${cartVersion}` : null;
      setCoupon(appliedCode);
      setDraft("");
      setError(null);
      setSwitching(false);
      onChecked(result);
    },
    onError: (err, code) => {
      const apiError = ApiError.from(err);
      const reason = apiError.field("code") ?? apiError.message;
      const current = getCoupon();
      if (code === current) {
        // A coupon applied earlier no longer fits the cart (e.g. below its minimum): forget it so
        // checkout doesn't send it, keep the code in the field, and say why.
        lastCheckedRef.current = null;
        setCoupon(null);
        setDraft(code);
        setInputOpen(true);
        setSwitching(false);
        setError(getDict().cartPage.noLongerApplies(code, reason));
        onChecked(null);
      } else {
        setError(reason);
        if (!current) onChecked(null);
      }
    },
  });

  // Re-check a remembered coupon whenever the cart's contents change (minimums, eligibility).
  const { mutate } = check;
  useEffect(() => {
    if (!saved) {
      lastCheckedRef.current = null;
      return;
    }
    const key = `${saved}|${cartVersion}`;
    if (lastCheckedRef.current === key) return;
    lastCheckedRef.current = key;
    mutate(saved);
  }, [saved, cartVersion, mutate]);

  // Focus the manual code input whenever the customer explicitly opens it.
  useEffect(() => {
    if (inputOpen || switching) document.getElementById("coupon-code")?.focus();
  }, [inputOpen, switching]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = draft.trim();
    if (!code) return setError(c.enterCoupon);
    check.mutate(code);
  };

  const applySaved = (code: string) => {
    setError(null);
    setDraft("");
    setSwitching(false);
    setCoupon(code);
  };

  const remove = () => {
    setCoupon(null);
    setDraft("");
    setError(null);
    setSwitching(false);
    setInputOpen(false);
    onChecked(null);
  };

  if (saved && check.isPending && !check.data) {
    return (
      <p
        className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-1 px-3.5 py-2.5 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <span className="truncate">{c.checkingCoupon(saved)}</span>
      </p>
    );
  }

  if (saved && check.data && !error && !switching) {
    return (
      <div
        className="flex items-center justify-between gap-2.5 rounded-xl border border-success/35 bg-success-tint/85 px-3 py-2.5 text-sm"
        role="status"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
            <Check className="size-4 stroke-[2.5]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <code className="truncate font-mono text-[13.5px] font-bold uppercase tracking-wider text-foreground">
                {check.data.code}
              </code>
              {check.data.applied === "offer" ? null : (
                <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold tabular-nums text-success">
                  −{formatMoney(check.data.discount_usd, check.data.discount_khr, currency)}
                </span>
              )}
            </span>
            {check.data.applied === "offer" ? null : (
              <span className="block text-xs font-medium text-success">{c.applied}</span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDraft("");
              setSwitching(true);
            }}
            className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-card/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {c.changeCoupon}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={remove}
            aria-label={c.removeCoupon(check.data.code ?? "")}
            className="text-success hover:bg-card/80 hover:text-success"
          >
            <X aria-hidden="true" />
          </Button>
        </span>
      </div>
    );
  }

  // No saved coupons and customer hasn't opened the coupon entry yet: compact dashed trigger.
  if (!saved && !inputOpen && savedCoupons.length === 0) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-controls="cart-coupon"
        onClick={() => setInputOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-dashed border-input/75 bg-surface-1/50 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-lapis-tint/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:min-h-10"
      >
        <span className="flex items-center gap-2">
          <TicketPercent className="size-4 text-primary" aria-hidden="true" />
          {c.haveCoupon}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  const showForm = inputOpen || switching || savedCoupons.length === 0 || Boolean(error);

  return (
    <div id="cart-coupon" className="grid gap-3 rounded-xl border border-border bg-surface-1/55 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <TicketPercent className="size-3.5 text-primary" aria-hidden="true" />
          {c.couponSection}
        </span>
        {switching ? (
          <button
            type="button"
            onClick={() => {
              setSwitching(false);
              setError(null);
              setDraft("");
            }}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {dict.ui.cancel}
          </button>
        ) : null}
      </div>

      {savedCoupons.length > 0 ? (
        <div className="grid gap-2">
          {savedCoupons.map((item) => {
            const isCurrent = Boolean(saved && saved.toUpperCase() === item.code.toUpperCase());
            const cap = item.max_discount_usd ? dict.rewards.upTo(formatMoney(item.max_discount_usd, null, currency)) : null;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-lg border border-dashed bg-card px-3 py-2 shadow-[0_1px_2px_rgb(14_19_53/0.04)] transition-colors",
                  isCurrent ? "border-success/60 bg-success-tint/35" : "border-success/45",
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-success-tint px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-success">
                      {percentLabel(item.percent_off)}% OFF
                    </span>
                    <code className="truncate font-mono text-[13px] font-bold uppercase tracking-wider text-foreground">
                      {item.code}
                    </code>
                  </div>
                  {cap ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{cap}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={check.isPending || isCurrent}
                  onClick={() => applySaved(item.code)}
                  aria-label={dict.rewards.applyCode(item.code)}
                  className={cn(
                    "inline-flex min-h-8 shrink-0 items-center rounded-lg px-3 text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent
                      ? "cursor-default bg-success-tint text-success"
                      : "bg-success text-success-foreground hover:brightness-110 active:scale-[0.97] disabled:opacity-50",
                  )}
                >
                  {isCurrent ? c.applied : dict.rewards.apply}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={submit} noValidate className={cn("grid gap-1.5", savedCoupons.length > 0 && "border-t border-border/80 pt-2.5")}>
          <label htmlFor="coupon-code" className="text-xs font-semibold text-foreground">
            {c.couponCode}
          </label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={50}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "coupon-error" : undefined}
              placeholder={c.couponPlaceholder}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 font-mono text-sm font-semibold uppercase tracking-wider outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
            />
            <Button type="submit" variant="default" size="sm" loading={check.isPending} className="h-10 px-4">
              {c.apply}
            </Button>
          </div>
          {error ? (
            <p id="coupon-error" className="flex items-start gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setInputOpen(true)}
          className="inline-flex min-h-8 items-center gap-1.5 justify-self-start rounded-md text-xs font-semibold text-primary transition-colors hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {c.enterAnotherCode}
        </button>
      )}
    </div>
  );
}
