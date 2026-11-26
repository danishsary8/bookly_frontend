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
      <SkeletonGroup label={dict.account.loadingStockAlerts} className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
          <Skeleton className="size-9 rounded-xl" />
          <div className="grid gap-1.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3 p-5">
          <Skeleton className="aspect-[2/3] w-12 shrink-0 rounded-md" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
        </div>
      </SkeletonGroup>
    );
  }

  if (alerts.isError) {
    return (
      <section
        aria-labelledby="stock-alerts-heading"
        className="shop-card rounded-2xl border border-border bg-card p-5 sm:p-6"
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
      className="overflow-hidden rounded-2xl border border-[#0284C7]/25 border-t-[3.5px] border-t-[#0284C7] bg-card shadow-[0_10px_28px_-18px_rgb(2_132_199/0.22)] dark:border-[#38BDF8]/30 dark:border-t-[#38BDF8]"
    >
      <div className="flex items-start gap-3 border-b border-[#0284C7]/15 bg-gradient-to-r from-[#E0F2FE]/75 via-card to-card px-5 py-4 dark:from-[#0284C7]/15">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#0284C7] text-white shadow-[0_6px_14px_-6px_rgb(2_132_199/0.55)] dark:bg-[#38BDF8] dark:text-[#070B22]">
          <Bell className="size-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="stock-alerts-heading"
            className="text-[15.5px] font-bold tracking-tight text-foreground"
          >
            {dict.account.stockAlerts}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {dict.account.stockAlertsLead}
          </p>
        </div>
      </div>
      <ul className="grid gap-3 p-5">
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
