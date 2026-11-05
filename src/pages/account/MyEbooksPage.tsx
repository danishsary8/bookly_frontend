import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Laptop, Monitor, Smartphone, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ebookApi, ebookKeys, ebookQueries, type EbookDeviceItem, type EbookLibraryItem } from "@/api/endpoints/ebooks";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { CoverThumb } from "@/components/CoverThumb";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

function deviceIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("phone") || lower.includes("android") || lower.includes("iphone") || lower.includes("mobile")) {
    return Smartphone;
  }
  if (lower.includes("mac") || lower.includes("laptop") || lower.includes("chrome os")) {
    return Laptop;
  }
  return Monitor;
}

export default function MyEbooksPage() {
  const { dict } = useT();
  const e = dict.ebook;
  useDocumentTitle(e.myEbooks);
  const queryClient = useQueryClient();

  const libraryQuery = useQuery(ebookQueries.library());
  const devicesQuery = useQuery(ebookQueries.devices());

  const [deviceToRemove, setDeviceToRemove] = useState<EbookDeviceItem | null>(null);

  const removeDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => ebookApi.removeDevice(deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ebookKeys.devices() });
      setDeviceToRemove(null);
      toast.success(e.deviceRemoved);
    },
    onError: (err) => {
      const apiErr = ApiError.from(err);
      toast.error(apiErr.message);
    },
  });

  const library = libraryQuery.data ?? [];
  const devices = devicesQuery.data?.data ?? [];
  const meta = devicesQuery.data?.meta;

  const nextRemovalDate = meta?.next_removal_at
    ? new Date(meta.next_removal_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const canRemove = !nextRemovalDate;

  return (
    <div className="grid gap-12">
      {/* 1. Ebooks Library */}
      <AccountSection title={e.libraryTitle} lead={e.libraryLead}>
        {libraryQuery.isPending ? (
          <SkeletonGroup label={dict.common.loading} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </SkeletonGroup>
        ) : libraryQuery.isError ? (
          <ErrorState error={libraryQuery.error} onRetry={() => libraryQuery.refetch()} headingLevel="h3" showHomeLink={false} />
        ) : library.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={e.noEbooksTitle}
            description={e.noEbooksLead}
            action={
              <Link to="/books" className={buttonVariants()}>
                {dict.account.browseBooks}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((item: EbookLibraryItem) => {
              const book = item.book;
              const total = item.page_count || 1;
              const current = item.last_page || 0;
              const percent = Math.min(100, Math.round((current / total) * 100));
              const ready = item.status === "ready";

              return (
                <div
                  key={book.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm"
                >
                  <div className="flex gap-3">
                    <CoverThumb src={book.cover_image_url} className="w-14 aspect-[2/3] rounded-md shadow-xs shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <h2 className="truncate font-semibold text-foreground text-sm" title={book.title}>
                        {book.title}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {(book.authors ?? []).map((a) => a.name).join(", ")}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        {ready ? (
                          <span className="font-medium text-muted-foreground">
                            {current > 0 ? e.progressPercent(percent) : e.startReading}
                          </span>
                        ) : (
                          <Badge tone="warning" shape="tint" className="text-[11px]">
                            {e.processingTitle}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
                    {/* Progress Bar */}
                    {ready && total > 0 ? (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    ) : null}

                    {ready ? (
                      <Link
                        to={`/read/${book.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center gap-1.5 text-xs font-semibold mt-1")}
                      >
                        <BookOpen className="size-3.5" aria-hidden="true" />
                        {current > 0 ? e.continueReading : e.startReading}
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="w-full text-xs opacity-60 mt-1">
                        {e.processingTitle}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccountSection>

      {/* 2. Reading Devices Section */}
      <section id="devices" aria-labelledby="devices-heading" className="grid gap-6 border-t border-border pt-10">
        <div className="grid gap-1">
          <h2 id="devices-heading" className="font-display text-2xl font-bold">
            {e.devicesSectionTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{e.devicesSectionLead(meta?.max_devices ?? 3)}</p>
        </div>

        {devicesQuery.isPending ? (
          <SkeletonGroup label={dict.common.loading} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </SkeletonGroup>
        ) : devicesQuery.isError ? (
          <ErrorState error={devicesQuery.error} onRetry={() => devicesQuery.refetch()} headingLevel="h3" showHomeLink={false} />
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No registered reading devices yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device: EbookDeviceItem) => {
              const Icon = deviceIcon(device.name);
              const addedDate = new Date(device.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const lastUsedDate = device.last_used_at
                ? new Date(device.last_used_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={device.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 place-items-center rounded-lg bg-surface-2 text-foreground">
                        <Icon className="size-5 text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-foreground">{device.name}</span>
                        <span className="text-xs text-muted-foreground">{e.registeredOn(addedDate)}</span>
                      </div>
                    </div>
                    {device.is_current ? (
                      <Badge tone="success" shape="tint" className="text-[11px] shrink-0">
                        {e.thisDevice}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {lastUsedDate ? e.lastUsedOn(lastUsedDate) : ""}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeviceToRemove(device)}
                      disabled={!canRemove || removeDeviceMutation.isPending}
                      title={!canRemove && nextRemovalDate ? e.deviceRemovalWait(nextRemovalDate) : e.removeDevice}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5"
                    >
                      <Trash2 className="size-3.5 mr-1" aria-hidden="true" />
                      {e.removeDevice}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!canRemove && nextRemovalDate ? (
          <p className="text-xs text-muted-foreground bg-surface-1 border border-border p-3 rounded-lg">
            {e.deviceRemovalWait(nextRemovalDate)}
          </p>
        ) : null}
      </section>

      {/* Remove confirmation dialog */}
      <ConfirmDialog
        open={Boolean(deviceToRemove)}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}
        title={e.removeConfirmTitle}
        description={`${deviceToRemove?.name ? `(${deviceToRemove.name}) ` : ""}${e.removeConfirmLead}`}
        confirmLabel={e.removeDevice}
        destructive
        loading={removeDeviceMutation.isPending}
        onConfirm={() => {
          if (deviceToRemove) {
            removeDeviceMutation.mutate(deviceToRemove.id);
          }
        }}
      />
    </div>
  );
}
