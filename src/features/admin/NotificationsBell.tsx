import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, PackageX } from "lucide-react";
import { Popover } from "radix-ui";
import { Link } from "react-router-dom";
import { staffApi, staffKeys, staffQueries } from "@/api/endpoints/staff";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { orderDateTime } from "@/features/orders/format";
import { cn } from "@/lib/utils";

/*
 * Header bell: low-stock notifications from the API (refreshed every minute).
 * The count badge shows unread ones; opening an item marks it read and goes to the
 * book; "Mark all as read" clears the badge.
 */
export function NotificationsBell() {
  const queryClient = useQueryClient();
  const notifications = useQuery(staffQueries.notifications());
  const unread = notifications.data?.meta.unread_count ?? 0;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: staffKeys.notifications() });
  const readOne = useMutation({ mutationFn: staffApi.readNotification, onSettled: refresh });
  const readAll = useMutation({ mutationFn: staffApi.readAllNotifications, onSettled: refresh });
  const list = notifications.data?.data ?? [];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell aria-hidden="true" />
          {unread ? (
            <span className="absolute right-1.5 top-1.5 grid min-w-[1.125rem] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-[1.125rem] text-accent-foreground tabular-nums" aria-hidden="true">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-(--z-popover) w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover shadow-overlay outline-none">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread ? (
              <Button variant="link" size="xs" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
                Mark all as read
              </Button>
            ) : null}
          </div>
          <div className="max-h-[22rem] overflow-y-auto p-2">
            {notifications.isError ? (
              <InlineError error={notifications.error} onRetry={() => notifications.refetch()} />
            ) : list.length === 0 ? (
              <p className="px-3 py-6 text-center text-[15px] text-muted-foreground">{notifications.isPending ? "Loading…" : "Nothing new. Low-stock alerts show up here."}</p>
            ) : (
              <ul className="grid gap-1">
                {list.map((n) => (
                  <li key={n.id}>
                    <Popover.Close asChild>
                      <Link
                        to={n.data.book_id ? `/admin/books/${n.data.book_id}` : "/admin/books"}
                        onClick={() => !n.read_at && readOne.mutate(n.id)}
                        className={cn(
                          "flex gap-3 rounded-md px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
                          !n.read_at && "bg-lapis-tint/60",
                        )}
                      >
                        <PackageX className="mt-0.5 size-[18px] shrink-0 text-warning" aria-hidden="true" />
                        <span className="grid gap-0.5">
                          <span className={cn(!n.read_at && "font-semibold")}>
                            {n.data.message ?? "Stock alert"}
                            {!n.read_at ? <span className="sr-only"> (unread)</span> : null}
                          </span>
                          <span className="text-sm text-muted-foreground">{orderDateTime(n.created_at)}</span>
                        </span>
                      </Link>
                    </Popover.Close>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
