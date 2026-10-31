import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import type { Customer } from "@/api/types";
import { CtaGlare } from "@/components/CtaGlare";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OtpInput } from "@/components/form/OtpInput";
import { Button } from "@/components/ui/button";
import { cambodianPhone } from "@/features/auth/schemas";
import { useTurnstile } from "@/features/auth/turnstile";
import { useT } from "@/i18n";

/** Seconds before "Send a new code" works again (the API allows one code a minute per number). */
export const RESEND_SECONDS = 60;

/*
 * Phone sign-in, step by step: the number → the Bookly Telegram bot sends a 6-digit code → the code signs in.
 * The API answers the same whether or not the number has an account (owner's choice), so the page always moves
 * on to the code and says "if this number has an account…". Codes only go to a confirmed number (one typed in
 * Profile is a courier contact, not confirmed), so the field hint says how to confirm it; people who get nothing
 * use the one-tap Telegram button the sign-in page shows under this (it confirms the number too).
 */
export function PhoneCodeSignIn({ onSignedIn }: { onSignedIn: (customer: Customer) => void }) {
  const { dict } = useT();
  const s = dict.signin;
  const turnstile = useTurnstile("phone_code");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  // After the first "Send code", the number is checked on every key press (like the other forms), so a fixed
  // number clears the error and brings the hint back without pressing Send again.
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [codeError, setCodeError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  const send = async (number: string) => {
    setError(null);
    setBusy(true);
    try {
      await authApi.phoneCode(number, await turnstile.getToken());
      setSentTo(number);
      setCode("");
      setCodeError(undefined);
      setWait(RESEND_SECONDS);
    } catch (err) {
      const apiError = ApiError.from(err);
      if (apiError.fieldErrors?.phone) setPhoneError(apiError.fieldErrors.phone[0]);
      // An API without code sign-in yet (the backend part not deployed): the one-tap button below still works.
      else if (apiError.kind === "not_found") setError(s.codeSignInUnavailable);
      else setError(apiError.message);
    } finally {
      setBusy(false);
      turnstile.reset();
    }
  };

  const checkPhone = (value: string) => {
    const parsed = cambodianPhone.safeParse(value);
    setPhoneError(parsed.success ? undefined : parsed.error.issues[0]?.message);
    return parsed;
  };

  const submitPhone = (event: FormEvent) => {
    event.preventDefault();
    setPhoneChecked(true);
    const parsed = checkPhone(phone);
    if (parsed.success) void send(parsed.data);
  };

  const changePhone = (value: string) => {
    setPhone(value);
    if (phoneChecked) checkPhone(value);
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!sentTo) return;
    if (!/^\d{6}$/.test(code)) return setCodeError(dict.forms.enterCode);
    setError(null);
    setCodeError(undefined);
    setBusy(true);
    try {
      const response = await authApi.phoneSignIn(sentTo, code);
      onSignedIn(response.customer);
    } catch (err) {
      const apiError = ApiError.from(err);
      if (apiError.kind === "validation") setCodeError(s.wrongCode);
      else setError(apiError.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  // The bot check stays mounted through both steps: "Send a new code" needs a fresh token too.
  return (
    <div className="grid gap-4">
      {sentTo === null ? (
        <form onSubmit={submitPhone} noValidate className="grid gap-4">
          {error ? <FormAlert title={error} /> : null}
          <TextField
            label={s.phoneNumber}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="012 345 678"
            hint={s.phoneCodeHint}
            value={phone}
            onChange={(e) => changePhone(e.target.value)}
            error={phoneError}
          />
          <CtaGlare block>
            <Button type="submit" variant="cta" size="lg" className="w-full" loading={busy}>
              {s.sendCode}
            </Button>
          </CtaGlare>
        </form>
      ) : (
        <form onSubmit={(e) => void submitCode(e)} noValidate className="grid gap-4">
          {error ? <FormAlert title={error} /> : <FormAlert tone="success">{s.codeSent(sentTo)}</FormAlert>}
          <OtpInput value={code} onChange={setCode} label={s.codeLabel} error={codeError} autoFocus />
          <CtaGlare block>
            <Button type="submit" variant="cta" size="lg" className="w-full" loading={busy}>
              {dict.auth.signIn}
            </Button>
          </CtaGlare>
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="link" className="min-h-11 px-0 text-sm" disabled={wait > 0 || busy} onClick={() => void send(sentTo)}>
              {wait > 0 ? s.resendIn(wait) : s.resend}
            </Button>
            <Button
              type="button"
              variant="link"
              className="min-h-11 px-0 text-sm"
              onClick={() => {
                setSentTo(null);
                setError(null);
                setCode("");
              }}
            >
              {s.changeNumber}
            </Button>
          </div>
        </form>
      )}
      {turnstile.widget}
    </div>
  );
}
