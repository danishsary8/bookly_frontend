import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { staffAuthApi, type TwoFactorSetup } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { updateSessionUser } from "@/api/session";
import { OtpInput } from "@/components/form/OtpInput";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffAuthFrame } from "@/features/admin/StaffAuthFrame";
import { useStaffSignOut } from "@/features/admin/staffSession";
import { adminNext } from "@/features/admin/adminNext";
import { toast } from "@/stores/toast";

/** The setup key in groups of four, easier to type into an app by hand. */
const grouped = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

/*
 * /admin/two-factor: first sign-in for a staff member. Shows a QR code for the
 * authenticator app (and the key to type by hand), then confirms with a code.
 * The QR library is loaded only here.
 */
export default function StaffTwoFactorSetupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signOut = useStaffSignOut();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const started = useRef(false);

  const start = useMutation({
    mutationFn: staffAuthApi.setupTwoFactor,
    onSuccess: async (result) => {
      setSetup(result);
      const QRCode = await import("qrcode");
      setQr(await QRCode.toString(result.otpauth_uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0E1335", light: "#FFFFFF" } }));
    },
    onError: (error) => setFormError(ApiError.from(error).message),
  });

  // One secret per visit: asking again would replace the one already scanned.
  const { mutate } = start;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  const confirm = useMutation({
    mutationFn: (value: string) => staffAuthApi.confirmTwoFactor(value),
    onSuccess: (result) => {
      updateSessionUser("staff", result.staff);
      toast.success({ title: "Two-step verification is on", description: "From now on you'll enter a code from your app when you sign in." });
      navigate(adminNext(params.get("next")), { replace: true });
    },
    onError: (error) => {
      setCode("");
      const apiError = ApiError.from(error);
      if (apiError.status === 422) setCodeError("That code didn't work. Check the app shows Bookly and use the code showing now.");
      else setFormError(apiError.message);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setCodeError("Enter the 6-digit code from your authenticator app.");
    setCodeError(undefined);
    confirm.mutate(code);
  };

  const copyKey = async () => {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      toast.success("Setup key copied");
    } catch {
      toast.error("Couldn't copy: select the key and copy it instead.");
    }
  };

  return (
    <StaffAuthFrame
      title="Set up two-step verification"
      lead="Staff accounts need a code from an authenticator app (such as Google Authenticator, Microsoft Authenticator or 1Password) at every sign-in."
      footer={
        <Button variant="link" onClick={() => void signOut().then(() => navigate("/admin/login", { replace: true }))}>
          Sign out and do this later
        </Button>
      }
    >
      {formError ? <FormAlert title={formError} /> : null}
      <ol className="grid gap-5">
        <li className="grid gap-3">
          <p className="font-semibold">1. Scan this QR code with the app</p>
          <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface-2 p-4">
            {qr ? (
              <div className="size-44 rounded-md bg-white p-1 [&_svg]:size-full" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: qr }} />
            ) : (
              <Skeleton className="size-44 rounded-md" />
            )}
            {setup ? (
              <div className="grid w-full gap-1 text-center">
                <p className="text-sm text-muted-foreground">Can't scan it? Enter this key in the app instead:</p>
                <p className="flex items-center justify-center gap-2">
                  <code className="select-all rounded-[4px] bg-card px-2 py-1 font-mono text-[15px] tracking-wide">{grouped(setup.secret)}</code>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void copyKey()} aria-label="Copy setup key">
                    <Copy aria-hidden="true" />
                  </Button>
                </p>
              </div>
            ) : null}
          </div>
        </li>
        <li className="grid gap-3">
          <p className="font-semibold">2. Enter the 6-digit code it shows</p>
          <form onSubmit={submit} noValidate className="grid gap-5">
            <OtpInput value={code} onChange={setCode} label="Authentication code" error={codeError} disabled={!setup || confirm.isPending} />
            <Button type="submit" size="lg" className="w-full" loading={confirm.isPending} disabled={!setup}>
              Turn on and continue
            </Button>
          </form>
        </li>
      </ol>
    </StaffAuthFrame>
  );
}
