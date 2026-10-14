import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2Off } from "lucide-react";
import { accountApi, accountKeys } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";
import { PasswordField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Row } from "@/features/account/SecurityRow";
import { isReady, prepare, requestToken, SocialCancelled, socialEnabled, type Provider } from "@/features/auth/social";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * Google / Facebook on Sign-in & security: connect (the provider's popup, plus the password when the account
 * has one, so a stolen session can't add someone else's Google) or disconnect (after a confirm). The API
 * refuses to remove the last way in; the row says so before anyone tries.
 */

const NAMES: Record<Provider, string> = { google: "Google", facebook: "Facebook" };
const ICONS: Record<Provider, string> = { google: "G", facebook: "f" };

export function SocialConnection({ provider, customer }: { provider: Provider; customer: Customer | undefined }) {
  const queryClient = useQueryClient();
  const name = NAMES[provider];
  const connected = Boolean(customer?.connected?.[provider]);
  const hasPassword = customer?.has_password !== false;
  const methods = customer?.sign_in_methods ?? [];
  const lastWayIn = connected && methods.length === 1 && methods[0] === provider;
  const canConnect = !connected && socialEnabled(provider);
  const [dialog, setDialog] = useState<"connect" | "disconnect" | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { dict } = useT();
  const t = dict.security;

  // Load the provider's script early: its popup must open straight from the click.
  useEffect(() => {
    if (canConnect) void prepare(provider).catch(() => undefined);
  }, [canConnect, provider]);

  const saved = (updated: Customer | undefined, title: string, description: string) => {
    if (updated) queryClient.setQueryData(accountKeys.me(), updated);
    void queryClient.invalidateQueries({ queryKey: accountKeys.me() });
    setDialog(null);
    toast.success({ title, description });
  };

  const openDialog = (next: "connect" | "disconnect" | null) => {
    if (busy) return;
    setDialog(next);
    setPassword("");
    setPasswordError(undefined);
    setError(null);
  };

  /** Called inside the click (or the dialog's submit), so the browser lets the popup open. */
  const connect = (withPassword?: string) => {
    if (!isReady(provider)) {
      const message = t.blocked(name);
      if (dialog) setError(message);
      else toast.error({ title: t.couldntOpen(name), description: message });
      void prepare(provider).catch(() => undefined);
      return;
    }
    setError(null);
    setPasswordError(undefined);
    requestToken(provider)
      .then(async (token) => {
        setBusy(true);
        const response = await accountApi.connect(provider, { access_token: token, ...(withPassword ? { password: withPassword } : {}) });
        saved(response.customer, t.nameConnected(name), t.canSignInWith(name));
      })
      .catch((err: unknown) => {
        if (err instanceof SocialCancelled) return;
        if (err instanceof Error && err.message === "popup_blocked") {
          const message = t.popupBlocked(name);
          return dialog ? setError(message) : toast.error({ title: t.couldntOpen(name), description: message });
        }
        const apiError = ApiError.from(err);
        if (apiError.field("password")) return setPasswordError(apiError.field("password"));
        if (dialog) setError(apiError.message);
        else toast.error({ title: t.couldntConnect(name), description: apiError.message });
      })
      .finally(() => setBusy(false));
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await accountApi.disconnect(provider);
      saved(response.customer, t.nameDisconnected(name), t.cantSignInWith(name));
    } catch (err) {
      setError(ApiError.from(err).message);
    } finally {
      setBusy(false);
    }
  };

  const action = connected ? (
    lastWayIn ? null : (
      <Button variant="outline" size="sm" onClick={() => openDialog("disconnect")}>
        {t.disconnect}
      </Button>
    )
  ) : canConnect ? (
    <Button variant="outline" size="sm" loading={busy && !dialog} onClick={() => (hasPassword ? openDialog("connect") : connect())}>
      {t.connect}
    </Button>
  ) : null;

  return (
    <Row
      icon={<span className="text-sm font-bold" aria-hidden="true">{ICONS[provider]}</span>}
      label={name}
      value={connected ? t.connected : <span className="text-muted-foreground">{t.notConnected}</span>}
      action={action}
    >
      {lastWayIn ? (
        <p className="text-sm text-muted-foreground">
          {t.onlyWayIn(name)}{" "}
          {customer?.email ? (
            <>
              <a href="#password" className="font-medium text-primary underline-offset-4 hover:underline">
                {t.addPasswordFirst}
              </a>
              {t.soYouCan}
            </>
          ) : (
            t.addEmailAndPassword
          )}
        </p>
      ) : null}

      <Dialog open={dialog === "connect"} onOpenChange={(open) => openDialog(open ? "connect" : null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t.connectTitle(name)}</DialogTitle>
            <DialogDescription>{t.connectLead(name)}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!password) return setPasswordError(dict.forms.enterPassword);
              connect(password);
            }}
          >
            {error ? <FormAlert title={error} /> : null}
            {/* Lets password managers match the password to the right account. */}
            <input type="text" name="username" autoComplete="username" value={customer?.email ?? ""} hidden readOnly />
            <PasswordField label={t.yourPassword} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={busy}>
                  {dict.ui.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" loading={busy}>
                {t.continueWith(name)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "disconnect"} onOpenChange={(open) => openDialog(open ? "disconnect" : null)}>
        <DialogContent size="sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t.disconnectTitle(name)}</DialogTitle>
            <DialogDescription>{t.disconnectLead(name)}</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={error} /> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={busy}>
                {t.keepIt}
              </Button>
            </DialogClose>
            <Button variant="destructive" loading={busy} onClick={() => void disconnect()}>
              <Link2Off aria-hidden="true" /> {t.disconnectName(name)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Row>
  );
}
