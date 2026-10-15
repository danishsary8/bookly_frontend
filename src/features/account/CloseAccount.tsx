import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { clearSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isReady, prepare, requestToken, SocialCancelled, socialEnabled, type Provider } from "@/features/auth/social";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * Account → Sign-in & security → Delete my account. Two deliberate steps: open the dialog, then prove it's
 * you (password, or the Google/Facebook account linked to Bookly, or fresh sign-in for passwordless/Telegram accounts)
 * and type DELETE. The API refuses while an order is on its way or a return is open, and says so.
 */
export function CloseAccount({ customer }: { customer: Customer | undefined }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signInAgain, setSignInAgain] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const { dict } = useT();
  const t = dict.closeAccount;
  const hasPassword = customer?.has_password !== false;
  const provider: Provider | null = hasPassword ? null : customer?.connected?.google ? "google" : customer?.connected?.facebook ? "facebook" : null;
  const providerName = provider === "google" ? "Google" : "Facebook";
  const confirmed = typed.trim() === "DELETE";

  const reset = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (next && provider && socialEnabled(provider)) void prepare(provider).catch(() => undefined);
    if (!next) {
      setPassword("");
      setTyped("");
      setError(null);
      setSignInAgain(false);
      setPasswordError(undefined);
    }
  };

  const close = async (proof: { password?: string; provider?: Provider; access_token?: string }) => {
    setBusy(true);
    setError(null);
    setSignInAgain(false);
    setPasswordError(undefined);
    try {
      const response = await accountApi.closeAccount({ confirm: "DELETE", ...proof });
      clearSession("customer");
      queryClient.clear();
      toast.success({ title: t.closed, description: response.message });
      navigate("/", { replace: true });
    } catch (err) {
      const apiError = ApiError.from(err);
      if (apiError.field("password")) {
        setPasswordError(apiError.field("password"));
      } else {
        setError(apiError.message);
        if (apiError.data?.reason === "sign_in_again") {
          setSignInAgain(true);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!confirmed) return;
    if (hasPassword) {
      if (!password) return setPasswordError(dict.forms.enterPassword);
      return void close({ password });
    }
    if (provider) {
      if (!socialEnabled(provider) || !isReady(provider)) {
        setError(t.unavailable(providerName));
        return;
      }
      // The provider's popup must open inside this click.
      requestToken(provider)
        .then((token) => close({ provider, access_token: token }))
        .catch((err: unknown) => {
          if (!(err instanceof SocialCancelled)) setError(t.couldntConfirm(providerName));
        });
      return;
    }
    // Accounts without password or social provider (e.g. Telegram-only accounts)
    void close({});
  };

  return (
    <section aria-labelledby="close-account" className="grid max-w-xl gap-3 rounded-xl border border-destructive/40 bg-card p-5 sm:p-6">
      <h2 id="close-account" className="font-display text-[1.563rem] leading-tight">
        {t.title}
      </h2>
      <p className="text-[15px] text-muted-foreground">{t.lead}</p>
      <Button variant="outline" className="justify-self-start border-destructive/50 text-destructive hover:bg-destructive-tint" onClick={() => reset(true)}>
        {t.open}
      </Button>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent size="sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogLead}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {error ? (
              <div className="grid gap-2">
                <FormAlert title={error} />
                {signInAgain ? (
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => {
                      void authApi.logout().finally(() => navigate(`/login?next=${encodeURIComponent("/account/security")}`));
                    }}
                  >
                    {dict.security.signInAgain}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {hasPassword ? (
              <PasswordField label={t.yourPassword} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
            ) : provider ? (
              <p className="flex items-start gap-2 text-[15px] text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                {t.confirmWith(providerName)}
              </p>
            ) : null}
            <TextField label={t.typeDelete} autoComplete="off" autoCapitalize="characters" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={busy}>
                  {t.keep}
                </Button>
              </DialogClose>
              <Button variant="destructive" type="submit" loading={busy} disabled={!confirmed}>
                {hasPassword || !provider ? t.submit : t.submitWith(providerName)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
