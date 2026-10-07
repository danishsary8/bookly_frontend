import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { clearSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isReady, prepare, requestToken, SocialCancelled, socialEnabled, type Provider } from "@/features/auth/social";
import { toast } from "@/stores/toast";

/*
 * Account → Sign-in & security → Delete my account. Two deliberate steps: open the dialog, then prove it's
 * you (password, or the Google/Facebook account linked to Bookly) and type DELETE. The API refuses while an
 * order is on its way or a return is open, and says so.
 */
export function CloseAccount({ customer }: { customer: Customer | undefined }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
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
      setPasswordError(undefined);
    }
  };

  const close = async (proof: { password?: string; provider?: Provider; access_token?: string }) => {
    setBusy(true);
    setError(null);
    setPasswordError(undefined);
    try {
      const response = await accountApi.closeAccount({ confirm: "DELETE", ...proof });
      clearSession("customer");
      queryClient.clear();
      toast.success({ title: "Your account is closed", description: response.message });
      navigate("/", { replace: true });
    } catch (err) {
      const apiError = ApiError.from(err);
      if (apiError.field("password")) setPasswordError(apiError.field("password"));
      else setError(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!confirmed) return;
    if (hasPassword) {
      if (!password) return setPasswordError("Enter your password.");
      return void close({ password });
    }
    if (!provider || !socialEnabled(provider) || !isReady(provider)) {
      setError(`${providerName} sign-in isn't available right now. Try again in a moment, or contact us to close your account.`);
      return;
    }
    // The provider's popup must open inside this click.
    requestToken(provider)
      .then((token) => close({ provider, access_token: token }))
      .catch((err: unknown) => {
        if (!(err instanceof SocialCancelled)) setError(`${providerName} couldn't confirm it's you. Try again.`);
      });
  };

  return (
    <section aria-labelledby="close-account" className="grid max-w-xl gap-3 rounded-xl border border-destructive/40 bg-card p-5 sm:p-6">
      <h2 id="close-account" className="font-display text-[1.563rem] leading-tight">
        Delete my account
      </h2>
      <p className="text-[15px] text-muted-foreground">
        You're signed out everywhere, and your reviews, wishlist and cart are removed straight away. Your name, email, phone number and addresses are erased
        after 30 days. We keep order records the law requires.
      </p>
      <Button variant="outline" className="justify-self-start border-destructive/50 text-destructive hover:bg-destructive-tint" onClick={() => reset(true)}>
        Delete my account…
      </Button>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent size="sm" role="alertdialog">
          <DialogHeader>
            <DialogTitle>Delete your Bookly account?</DialogTitle>
            <DialogDescription>This can't be undone after 30 days. Orders on their way and open returns need to finish first.</DialogDescription>
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
              <FormAlert title={error} />
            ) : null}
            {hasPassword ? (
              <PasswordField label="Your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
            ) : (
              <p className="flex items-start gap-2 text-[15px] text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                You'll confirm with the {providerName} account you sign in with.
              </p>
            )}
            <TextField label="Type DELETE to confirm" autoComplete="off" autoCapitalize="characters" value={typed} onChange={(e) => setTyped(e.target.value)} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={busy}>
                  Keep my account
                </Button>
              </DialogClose>
              <Button variant="destructive" type="submit" loading={busy} disabled={!confirmed}>
                {hasPassword ? "Delete my account" : `Confirm with ${providerName}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
