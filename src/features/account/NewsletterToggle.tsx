import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsletterApi, newsletterQueries, newsletterKeys } from "@/api/endpoints/newsletter";
import { ApiError } from "@/api/errors";
import { useT } from "@/i18n";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/stores/toast";
import type { Customer } from "@/api/types";
import { Loader2 } from "lucide-react";

export function NewsletterToggle({ customer }: { customer: Customer }) {
  const { dict, lang } = useT();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(newsletterQueries.customerStatus());

  const mutation = useMutation({
    mutationFn: (newSubscribed: boolean) =>
      newsletterApi.updateCustomerStatus(newSubscribed, lang === "km" ? "km" : "en"),
    onSuccess: (res) => {
      queryClient.setQueryData(newsletterKeys.customer(), {
        subscribed: res.subscribed,
        status: res.status,
        locale: res.locale,
      });
      toast.success(res.message);
    },
    onError: (err: unknown) => {
      const msg = ApiError.from(err).message || dict.common.error;
      toast.error(msg);
    },
  });

  const isVerified = Boolean(customer.email_verified);
  const isSubscribed = Boolean(data?.subscribed);

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <label
            htmlFor="account-newsletter-toggle"
            className="text-base font-semibold text-foreground"
          >
            {dict.newsletter.accountSubscription}
          </label>
          <p className="max-w-md text-sm text-muted-foreground">
            {dict.newsletter.accountSubscriptionLead}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {mutation.isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            id="account-newsletter-toggle"
            checked={isSubscribed}
            disabled={!isVerified || isLoading || mutation.isPending}
            onCheckedChange={(checked) => mutation.mutate(checked)}
            aria-label={dict.newsletter.accountSubscription}
          />
        </div>
      </div>

      {!isVerified && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {dict.newsletter.accountVerifyEmailFirst}
        </p>
      )}

      {isVerified && (
        <p className="text-xs text-muted-foreground">
          {isSubscribed ? dict.newsletter.accountSubscribed : dict.newsletter.accountNotSubscribed}
        </p>
      )}
    </div>
  );
}
