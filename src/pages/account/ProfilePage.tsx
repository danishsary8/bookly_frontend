import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

/* /account/profile: name and phone. The email is the sign-in identity, so it is shown but not editable. */
export default function ProfilePage() {
  useDocumentTitle("Profile");
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
      toast.success("Profile saved");
    } catch (error) {
      const message = applyApiErrors(error, setError, ["name", "phone"]);
      if (message) {
        setFormError(message);
        requestAnimationFrame(() => alertRef.current?.focus());
      }
    }
  };

  return (
    <AccountSection title="Profile" lead="Your name appears on orders and receipts; couriers use your phone number for deliveries.">
      <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="grid max-w-xl gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        {formError ? <FormAlert ref={alertRef} title={formError} /> : null}
        <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField label="Phone" optional type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" error={errors.phone?.message} {...register("phone")} />
        <div className="grid gap-1.5">
          <label htmlFor="profile-email" className="text-sm font-semibold">
            Email
          </label>
          <input id="profile-email" value={customer.email ?? ""} readOnly aria-describedby="profile-email-hint" className="h-12 rounded-md border border-border bg-surface-2 px-3.5 text-base text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <p id="profile-email-hint" className="text-sm text-muted-foreground">
            This is how you sign in, so it can't be changed here.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
          {isDirty ? (
            <Button type="button" variant="ghost" onClick={() => reset()}>
              Discard changes
            </Button>
          ) : null}
        </div>
      </form>
    </AccountSection>
  );
}
