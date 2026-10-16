import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, TicketPercent } from "lucide-react";
import { accountQueries, type StoreCredit } from "@/api/endpoints/account";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { orderDate } from "@/features/orders/format";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

function CreditItem({ credit }: { credit: StoreCredit }) {
  const { dict, locale } = useT();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(credit.code);
      setCopied(true);
      toast.success({
        title: dict.account.codeCopied,
        description: credit.code,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error({ title: dict.account.copyFailed });
    }
  };

  const spent = credit.used || credit.expired;

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 p-4${spent ? " opacity-70" : ""}`}
    >
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-mono text-base font-bold tracking-wider ${spent ? "text-muted-foreground line-through" : "text-primary"}`}
          >
            {credit.code}
          </span>
          {spent ? (
            <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {credit.used
                ? dict.account.creditUsed
                : dict.account.creditExpired}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={copyCode}
              aria-label={`Copy code ${credit.code}`}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-success" aria-hidden="true" />
                  <span className="text-success">
                    {dict.account.codeCopied}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden="true" />
                  <span>{dict.account.copyCode}</span>
                </>
              )}
            </Button>
          )}
        </div>
        {credit.expires_at && !spent ? (
          <p className="text-xs text-muted-foreground">
            {dict.account.expiresOn(orderDate(credit.expires_at, locale))}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <span className="font-display text-xl font-bold tabular-nums text-foreground">
          {formatUsd(credit.amount_usd)}
        </span>
      </div>
    </li>
  );
}

export function StoreCreditsCard() {
  const { dict } = useT();
  const credits = useQuery(accountQueries.storeCredits());

  if (credits.isPending) {
    return (
      <SkeletonGroup
        label={dict.account.loadingStoreCredits}
        className="grid gap-2"
      >
        <Skeleton className="h-20 rounded-xl" />
      </SkeletonGroup>
    );
  }

  const items = credits.data ?? [];
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="store-credits-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
          <TicketPercent className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="store-credits-heading"
            className="font-display text-[1.375rem] leading-tight"
          >
            {dict.account.storeCredits}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.account.storeCreditsLead}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3">
        {items.map((credit: StoreCredit) => (
          <CreditItem key={credit.id} credit={credit} />
        ))}
      </ul>
    </section>
  );
}
