import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { accountApi, accountKeys } from "@/api/endpoints/account";
import { PasswordField, TextField } from "@/components/form/Field";
import { OtpInput } from "@/components/form/OtpInput";
import { Button } from "@/components/ui/button";
import { changeEmailSchema, verifyEmailSchema, type ChangeEmailValues, type VerifyEmailValues } from "@/features/auth/schemas";
import { useTurnstile } from "@/features/auth/turnstile";
import { applyApiErrors } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * Add or change the account's email, in place on Sign-in & security. Two steps: the new address (and the
 * password, when the account has one) gets a 6-digit code; the code saves it as verified. The old email
 * keeps working until then, so a typo never locks anyone out.
 */
export function EmailChanger({ current, hasPassword, onDone }: { current: string | null; hasPassword: boolean; onDone: () => void }) {
  const queryClient = useQueryClient();
  const turnstile = useTurnstile("change_email");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const emailForm = useForm<ChangeEmailValues>({ resolver: zodResolver(changeEmailSchema(hasPassword)), defaultValues: { email: "", password: "" } });
  const codeForm = useForm<VerifyEmailValues>({ resolver: zodResolver(verifyEmailSchema), defaultValues: { code: "" } });

  const send = async (values: ChangeEmailValues) => {
    try {
      const token = await turnstile.getToken();
      const response = await accountApi.sendEmailCode({
        email: values.email,
        ...(hasPassword ? { password: values.password } : {}),
        ...(token ? { turnstile_token: token } : {}),
      });
      setSentTo(response.email ?? values.email);
      codeForm.reset();
      toast.success({ title: "Code sent", description: `Check the inbox of ${response.email ?? values.email}.` });
    } catch (error) {
      const message = applyApiErrors(error, emailForm.setError, ["email", "password"]);
      if (message) emailForm.setError("email", { type: "server", message });
    } finally {
      turnstile.reset();
    }
  };

  const confirm = async (values: VerifyEmailValues) => {
    try {
      const response = await accountApi.confirmEmail(values.code);
      if (response.customer) queryClient.setQueryData(accountKeys.me(), response.customer);
      await queryClient.invalidateQueries({ queryKey: accountKeys.me() });
      toast.success({ title: current ? "Email changed" : "Email added", description: "Other devices were signed out. You stay signed in here." });
      onDone();
    } catch (error) {
      const message = applyApiErrors(error, codeForm.setError, ["code"]);
      if (message) {
        codeForm.setError("code", { type: "server", message });
        requestAnimationFrame(() => codeRef.current?.querySelector("input")?.focus());
      }
    }
  };

  if (sentTo) {
    return (
      <form onSubmit={(event) => void codeForm.handleSubmit(confirm)(event)} noValidate className="grid gap-4 rounded-lg bg-surface-2 p-4">
        <p className="text-[15px]">
          Enter the code we emailed to <strong className="break-all font-semibold">{sentTo}</strong>. It may take a minute or two, and it can land in spam.
        </p>
        <div ref={codeRef}>
          <Controller
            control={codeForm.control}
            name="code"
            render={({ field, fieldState }) => <OtpInput value={field.value} onChange={field.onChange} label="Email code" error={fieldState.error?.message} autoFocus />}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={codeForm.formState.isSubmitting}>
            {current ? "Change email" : "Add email"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSentTo(null)}>
            Use another email
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void emailForm.handleSubmit(send)(event)} noValidate className="grid gap-4 rounded-lg bg-surface-2 p-4">
      <TextField
        label={current ? "New email" : "Email"}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="name@example.com"
        hint={current ? `${current} keeps working until you enter the code.` : "We'll send a 6-digit code to check it's yours."}
        error={emailForm.formState.errors.email?.message}
        {...emailForm.register("email")}
      />
      {hasPassword ? (
        <PasswordField label="Your Bookly password" autoComplete="current-password" error={emailForm.formState.errors.password?.message} {...emailForm.register("password")} />
      ) : null}
      {turnstile.widget}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={emailForm.formState.isSubmitting}>
          Send code
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
