import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { accountApi, accountKeys } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

/**
 * Account → Profile: opt-in emails when a "Want to read" wishlist book gets 5%+ cheaper (off by default; the API
 * sends at most one per book a week). Needs a confirmed email, like the newsletter switch.
 */
export function PriceDropToggle({ customer }: { customer: Customer }) {
  const { dict } = useT();
  const t = dict.priceDrop;
  const queryClient = useQueryClient();
  const isVerified = Boolean(customer.email_verified);
  const isOn = Boolean(customer.price_drop_alerts);

  const mutation = useMutation({
    mutationFn: (on: boolean) => accountApi.updateProfile({ price_drop_alerts: on }),
    onSuccess: (updated) => {
      queryClient.setQueryData(accountKeys.me(), updated);
      toast.success(updated.price_drop_alerts ? t.saved : t.savedOff);
    },
    onError: (err: unknown) => toast.error(ApiError.from(err).message || dict.common.error),
  });

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <label htmlFor="account-price-drop-toggle" className="text-base font-semibold text-foreground">
            {t.title}
          </label>
          <p id="account-price-drop-lead" className="max-w-md text-sm text-muted-foreground">
            {t.lead}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {mutation.isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
          <Switch
            id="account-price-drop-toggle"
            checked={isOn}
            disabled={!isVerified || mutation.isPending}
            onCheckedChange={(checked) => mutation.mutate(checked)}
            aria-describedby="account-price-drop-lead"
          />
        </div>
      </div>
      <p className={isVerified ? "text-xs text-muted-foreground" : "text-xs text-amber-700 dark:text-amber-400"}>
        {!isVerified ? t.verifyFirst : isOn ? t.on : t.off}
      </p>
    </div>
  );
}
