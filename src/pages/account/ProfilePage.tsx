import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { accountApi, accountKeys, accountQueries } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button } from "@/components/ui/button";
import { AccountSection } from "@/features/account/AccountSection";
import { profileSchema, type ProfileValues } from "@/features/account/schemas";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { applyApiErrors } from "@/lib/forms";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/* /account/profile: name and phone. The email is the sign-in identity: shown here, changed on Sign-in & security (with a code). */
export default function ProfilePage() {
  const { dict } = useT();
  useDocumentTitle(dict.account.profile);
  const session = useSession<Customer>("customer");
  const me = useQuery(accountQueries.me());
  const customer = me.data ?? session?.user;
  if (!customer) return null;
  // Remount when the stored profile changes so the form starts from the saved values.
  return <ProfileForm key={`${customer.name}|${customer.phone ?? ""}`} customer={customer} />;
}

function ProfileForm({ customer }: { customer: Customer }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const { dict } = useT();
  const a = dict.account;
  const { register, handleSubmit, setError, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: customer.name ?? "", phone: customer.phone ?? "" },
  });
  const { errors, isSubmitting, isDirty } = formState;

  const submit = async (values: ProfileValues) => {
    setFormError(null);
    try {
      const updated = await accountApi.updateProfile({ name: values.name, phone: values.phone || null });
      queryClient.setQueryData(accountKeys.me(), updated);
      reset({ name: updated.name ?? "", phone: updated.phone ?? "" });
      toast.success(a.profileSaved);
    } catch (error) {
      const message = applyApiErrors(error, setError, ["name", "phone"]);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    }
  };

  return (
    <AccountSection title={a.profile} lead={a.profileLead}>
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid max-w-xl gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField label={a.fullName} autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label={a.phone} optional type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" error={errors.phone?.message} {...register("phone")} />
        <div className="grid gap-1.5">
          <label htmlFor="profile-email" className="text-sm font-semibold">
            {a.email}
          </label>
          <input id="profile-email" value={customer.email ?? ""} readOnly aria-describedby="profile-email-hint" className="h-12 rounded-md border border-border bg-surface-2 px-3.5 text-base text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <p id="profile-email-hint" className="text-sm text-muted-foreground">
            {a.emailHint}{" "}
            <Link to="/account/security" className="font-medium text-primary underline-offset-4 hover:underline">
              {a.emailHintLink}
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            {isSubmitting ? dict.ui.saving : a.saveChanges}
          </Button>
          {isDirty ? (
            <Button type="button" variant="ghost" onClick={() => reset()}>
              {a.discardChanges}
            </Button>
          ) : null}
        </div>
      </form>
    </AccountSection>
  );
}
