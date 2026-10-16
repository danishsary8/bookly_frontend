import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { staffQueries } from "@/api/endpoints/staff";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel } from "@/features/admin/reportKit";
import { cn } from "@/lib/utils";

export function SystemHealthCard() {
  const { data: health, isLoading, isError, refetch, isFetching } = useQuery(staffQueries.health());

  const statusBadge = (status: "ok" | "degraded" | "down" | "off") => {
    switch (status) {
      case "ok":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Operational
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            Degraded
          </span>
        );
      case "down":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
            <XCircle className="size-3.5" aria-hidden="true" />
            Down
          </span>
        );
      case "off":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            Off
          </span>
        );
    }
  };

  return (
    <Panel
      id="system-health"
      title="System health"
      action={
        <div className="flex items-center gap-2">
          {health ? statusBadge(health.status) : null}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label="Refresh system health"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      ) : isError || !health ? (
        <p className="text-sm text-destructive">Could not load system health details.</p>
      ) : (
        <div className="grid gap-3 divide-y divide-border/60 text-sm">
          <div className="flex items-center justify-between pt-1 first:pt-0">
            <div>
              <p className="font-semibold">Database</p>
              <p className="text-xs text-muted-foreground">PostgreSQL connection & migrations</p>
            </div>
            {statusBadge(health.checks.database.status)}
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-semibold">Background queue</p>
              <p className="text-xs text-muted-foreground">
                {health.checks.queue.pending} pending · {health.checks.queue.failed} failed
                {health.checks.queue.oldest_pending_seconds
                  ? ` · oldest ${Math.round(health.checks.queue.oldest_pending_seconds / 60)}m`
                  : ""}
              </p>
            </div>
            {statusBadge(health.checks.queue.status)}
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="font-semibold">Telegram bot</p>
              <p className="text-xs text-muted-foreground">
                {health.checks.telegram_bot.error
                  ? health.checks.telegram_bot.error
                  : health.checks.telegram_bot.status === "off"
                    ? "Bot token not configured"
                    : health.checks.telegram_bot.repaired
                      ? "Webhook verified & auto-repaired"
                      : "Webhook connected"}
              </p>
            </div>
            {statusBadge(health.checks.telegram_bot.status)}
          </div>
        </div>
      )}
    </Panel>
  );
}
