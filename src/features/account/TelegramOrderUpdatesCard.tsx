import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, CheckCircle2, Loader2, ExternalLink, X, Bell } from "lucide-react";
import { accountApi, accountKeys } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

interface Props {
  customer: Customer;
}

export function TelegramOrderUpdatesCard({ customer }: Props) {
  const { dict } = useT();
  const t = dict.telegramUpdates;
  const queryClient = useQueryClient();

  const [isConnecting, setIsConnecting] = useState(false);
  const [waitingLink, setWaitingLink] = useState<{ url: string; key: string } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  const isConnected = Boolean(customer.telegram_connected);
  const isEnabled = Boolean(customer.telegram_order_updates);

  // Poll Telegram status while waitingLink is active
  useEffect(() => {
    if (!waitingLink) return;

    let active = true;

    const poll = async () => {
      try {
        const result = await authApi.telegram.status(waitingLink.key);
        if (!active) return;

        if (result.status === "done") {
          setWaitingLink(null);
          setIsConnecting(false);
          queryClient.setQueryData(accountKeys.me(), result.customer);
          toast.success(t.connectedSuccess);
          return;
        }

        if (result.status === "failed") {
          setWaitingLink(null);
          setIsConnecting(false);
          toast.error(result.message || dict.common.error);
          return;
        }

        // Still pending: poll again in 2 seconds
        pollTimerRef.current = window.setTimeout(poll, 2000);
      } catch (err) {
        if (!active) return;
        setWaitingLink(null);
        setIsConnecting(false);
        toast.error(ApiError.from(err).message || dict.common.error);
      }
    };

    pollTimerRef.current = window.setTimeout(poll, 2000);

    return () => {
      active = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [waitingLink, queryClient, t.connectedSuccess, dict.common.error]);

  const handleStartConnect = async () => {
    setIsConnecting(true);
    try {
      const link = await authApi.telegram.orderUpdates();
      setWaitingLink({ url: link.url, key: link.key });
      window.open(link.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setIsConnecting(false);
      toast.error(ApiError.from(err).message || dict.common.error);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      const updated = await accountApi.updateProfile({ telegram_order_updates: checked });
      queryClient.setQueryData(accountKeys.me(), updated);
      toast.success(t.statusUpdated);
    } catch (err) {
      toast.error(ApiError.from(err).message || dict.common.error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const updated = await accountApi.disconnectTelegram();
      queryClient.setQueryData(accountKeys.me(), updated);
      toast.success(t.disconnectedSuccess);
    } catch (err) {
      toast.error(ApiError.from(err).message || dict.common.error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCancelWait = () => {
    setWaitingLink(null);
    setIsConnecting(false);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Send className="size-5" aria-hidden="true" />
          </span>
          <div className="grid gap-1">
            <h3 className="text-base font-semibold text-foreground">{t.title}</h3>
            <p className="max-w-md text-sm text-muted-foreground">{t.lead}</p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 pt-1">
            {isToggling && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <Switch
              id="telegram-order-updates-toggle"
              checked={isEnabled}
              disabled={isToggling || isDisconnecting}
              onCheckedChange={handleToggle}
              aria-label={t.title}
            />
          </div>
        ) : null}
      </div>

      {/* Waiting screen while bot /start is pending */}
      {waitingLink ? (
        <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
              <span>{t.waitingTitle}</span>
            </div>
            <button
              type="button"
              onClick={handleCancelWait}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t.cancel}
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{t.waitingLead}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(waitingLink.url, "_blank", "noopener,noreferrer")}
              className="gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              {t.openAgain}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancelWait}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Status section when connected */}
      {isConnected && !waitingLink ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm border-t border-border/60">
          <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t.connected} ({isEnabled ? t.enabled : t.disabled})
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            loading={isDisconnecting}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            {t.disconnectButton}
          </Button>
        </div>
      ) : null}

      {/* Connect button when not connected and not waiting */}
      {!isConnected && !waitingLink ? (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Bell className="size-3.5" />
            {t.notConnected}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartConnect}
            loading={isConnecting}
            className="gap-2"
          >
            <Send className="size-3.5 text-primary" />
            {t.connectButton}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
