import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { stockAlertQueries, stockAlertsApi } from "@/api/endpoints/stockAlerts";
import type { StockAlert } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { formatName, useT } from "@/i18n";
import { formatMoney, useCurrency } from "@/stores/currency";
import { toast } from "@/stores/toast";

function AlertItem({
  alert,
  onRemove,
}: {
  alert: StockAlert;
  onRemove: (id: number) => void;
}) {
  const { dict } = useT();
  const currency = useCurrency();
  const book = alert.book;
  const variant = alert.variant;

  if (!book || !alert.id) return null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 p-3 sm:p-4">
      <Link
        to={`/books/${book.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 group outline-none"
      >
        <div className="w-12 shrink-0">
          <BookCover
            title={book.title ?? ""}
            src={book.cover_image_url}
            className="aspect-[2/3] w-full rounded shadow-sm group-hover:shadow transition-shadow"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {variant?.format ? formatName(dict, variant.format) : null}
            {variant?.price_usd
              ? ` · ${formatMoney(variant.price_usd, undefined, currency)}`
              : null}
          </p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(alert.id!)}
        aria-label={`${dict.account.removeAlert} ${book.title}`}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </li>
  );
}

export function StockAlertsCard() {
  const { dict } = useT();
  const queryClient = useQueryClient();
  const alerts = useQuery(stockAlertQueries.list());

  const removeMutation = useMutation({
    mutationFn: (id: number) => stockAlertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockAlertQueries.all() });
      toast.success(dict.account.alertRemoved);
    },
    onError: () => {
      toast.error(dict.account.removeAlertFailed);
    },
  });

  if (alerts.isPending) {
    return (
      <SkeletonGroup
        label={dict.account.loadingStockAlerts}
        className="grid gap-2"
      >
        <Skeleton className="h-20 rounded-xl" />
      </SkeletonGroup>
    );
  }

  if (alerts.isError) {
    return (
      <section
        aria-labelledby="stock-alerts-heading"
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <h2
          id="stock-alerts-heading"
          className="font-display text-[1.375rem] leading-tight"
        >
          {dict.account.stockAlerts}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.account.stockAlertsLoadFailed}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => alerts.refetch()}
        >
          {dict.ui.tryAgain}
        </Button>
      </section>
    );
  }

  const items = (alerts.data ?? []).filter((a) => !a.notified_at);
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="stock-alerts-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">
          <Bell className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="stock-alerts-heading"
            className="font-display text-[1.375rem] leading-tight"
          >
            {dict.account.stockAlerts}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.account.stockAlertsLead}
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3">
        {items.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onRemove={(id) => removeMutation.mutate(id)}
          />
        ))}
      </ul>
    </section>
  );
}
