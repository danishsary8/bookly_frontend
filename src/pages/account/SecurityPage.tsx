import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, accountKeys, accountQueries } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { PasswordField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AccountSection } from "@/features/account/AccountSection";
import { SignInMethods } from "@/features/account/SignInMethods";
import { passwordSchema, type PasswordValues } from "@/features/account/schemas";
import { PasswordChecklist } from "@/features/auth/PasswordChecklist";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { applyApiErrors } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * /account/security: how this account signs in (email, phone with Telegram, Google, Facebook) and the
 * password form: change it, or set one for accounts made with Google/Facebook. Saving a password keeps
 * this session and signs out every other device.
 */
export default function SecurityPage() {
  useDocumentTitle("Sign-in & security");
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  const customer = me.data ?? session?.user;
  const hasPassword = customer?.has_password !== false;
  return (
    <AccountSection title="Sign-in & security" lead="How you sign in to Bookly, and your password.">
      <SignInMethods customer={customer} />
      <PasswordForm key={String(hasPassword)} hasPassword={hasPassword} />
    </AccountSection>
  );
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, reset, control, formState } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema(hasPassword)),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });
  const { errors, isSubmitting } = formState;
  const password = useWatch({ control, name: "password" });

  const submit = async (values: PasswordValues) => {
    setFormError(null);
    try {
      await accountApi.changePassword({
        ...(hasPassword ? { current_password: values.current_password } : {}),
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      reset();
      if (!hasPassword) void queryClient.invalidateQueries({ queryKey: accountKeys.me() });
      toast.success({ title: hasPassword ? "Password changed" : "Password set", description: "You stay signed in here; other devices were signed out." });
    } catch (error) {
      const message = applyApiErrors(error, setError, ["current_password", "password", "password_confirmation"]);
      if (message && /current password/i.test(message)) {
        // The API reports a wrong current password without a field; it belongs on that field.
        setError("current_password", { type: "server", message }, { shouldFocus: true });
      } else if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    }
  };

  return (
    <section id="password" aria-labelledby="password-title" className="grid scroll-mt-24 gap-3">
      <div className="grid gap-1">
        <h2 id="password-title" className="font-display text-[1.563rem] leading-tight">
          {hasPassword ? "Change password" : "Set a password"}
        </h2>
        <p className="text-[15px] text-muted-foreground">
          {hasPassword ? "Use a password you don't use anywhere else." : "You signed up with Google or Facebook. Set a password to also sign in with your email."}
        </p>
      </div>
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid max-w-xl gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        {/* Lets password managers match the change to the right account. */}
        <input type="text" name="username" autoComplete="username" hidden readOnly />
        {hasPassword ? <PasswordField label="Current password" autoComplete="current-password" error={errors.current_password?.message} {...register("current_password")} /> : null}
        <div className="grid gap-3">
          <PasswordField label="New password" autoComplete="new-password" aria-describedby="account-password-rules" error={errors.password?.message} {...register("password")} />
          <PasswordChecklist id="account-password-rules" value={password ?? ""} />
        </div>
        <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.password_confirmation?.message} {...register("password_confirmation")} />
        <FormAlert tone="info">Saving signs you out on your other devices. You stay signed in here.</FormAlert>
        <Button type="submit" loading={isSubmitting} className="justify-self-start">
          {isSubmitting ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </Button>
      </form>
    </section>
  );
}
