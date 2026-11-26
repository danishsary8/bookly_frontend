import { useRef, useState } from "react";
import { BadgeCheck, Bell, KeyRound, Mail, ShoppingBag, TrendingDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { accountApi, accountKeys, accountQueries } from "@/api/endpoints/account";
import { useSession } from "@/api/session";
import type { Customer } from "@/api/types";
import { TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Button, buttonVariants } from "@/components/ui/button";
import { AccountSection } from "@/features/account/AccountSection";
import { NewsletterToggle } from "@/features/account/NewsletterToggle";
import { PriceDropToggle } from "@/features/account/PriceDropToggle";
import { CartReminderToggle } from "@/features/account/CartReminderToggle";
import { TelegramOrderUpdatesCard } from "@/features/account/TelegramOrderUpdatesCard";
import { isVerified } from "@/features/auth/verification";
import { profileSchema, type ProfileValues } from "@/features/account/schemas";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { applyApiErrors } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * /account/profile: clean structured production profile layout — identity strip, 2-column
 * personal details form, read-only email with inline Security link, password quick-link row,
 * right-aligned Discard/Save footer, and grouped notification preferences switches.
 */
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
  const { dict, locale } = useT();
  const a = dict.account;
  const verified = isVerified(customer);
  const initial = (customer.name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const memberSince = customer.created_at
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(customer.created_at))
    : null;

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
      <div className="account-profile-stack">
        {/* Identity & Personal Details form (structured SaaS settings rhythm) */}
        <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="account-clean-card account-profile-card">
          <div className="account-profile-identity">
            <span className="account-avatar-circle account-avatar-circle-xl" aria-hidden="true">
              {initial}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[16px] font-semibold text-foreground">{customer.name || dict.accountUi.personalDetails}</h2>
                {verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-semibold text-success">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {customer.email_verified ? a.emailVerified : a.phoneVerified}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[13px] text-muted-foreground">
                {customer.email}
                {memberSince ? ` · ${a.memberSince(memberSince)}` : null}
              </p>
            </div>
          </div>

          {formError ? (
            <div className="px-5 pt-4 sm:px-6">
              <FormAlert ref={alertRef} title={formError} />
            </div>
          ) : null}

          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField disabled={isSubmitting} label={a.fullName} autoComplete="name" error={errors.name?.message} {...register("name")} />
              <TextField
                label={a.phone}
                disabled={isSubmitting}
                optional
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="012 345 678"
                hint={
                  <>
                    {a.phoneHint}{" "}
                    <Link to="/account/security" className="font-medium text-primary underline-offset-4 hover:underline">
                      {a.phoneHintLink}
                    </Link>
                    {a.phoneHintEnd}
                  </>
                }
                error={errors.phone?.message}
                {...register("phone")}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="profile-email" className="text-sm font-semibold text-foreground">
                {a.email}
              </label>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <input
                  id="profile-email"
                  type="email"
                  value={customer.email ?? ""}
                  readOnly
                  aria-describedby="profile-email-hint"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-2/65 px-3.5 text-[15px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Link to="/account/security#sign-in-methods" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 shrink-0 rounded-lg px-4 text-[13.5px]")}>
                  {a.security}
                </Link>
              </div>
              <p id="profile-email-hint" className="text-xs leading-relaxed text-muted-foreground">
                {a.emailHint}{" "}
                <Link to="/account/security" className="font-medium text-primary underline-offset-4 hover:underline">
                  {a.emailHintLink}
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Password shortcut row (matches clean settings reference) */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/80 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-foreground" aria-hidden="true">
                <KeyRound className="size-4" />
              </span>
              <div className="grid min-w-0 gap-0.5">
                <p className="text-sm font-semibold text-foreground">{a.changePassword}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{a.securityLead}</p>
              </div>
            </div>
            <Link to="/account/security#password" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 shrink-0 rounded-lg px-4 text-[13.5px]")}>
              {a.changePassword}
            </Link>
          </div>

          {/* Right-aligned Save / Discard footer bar */}
          <div className="account-profile-footer">
            {isDirty ? (
              <Button type="button" variant="outline" size="sm" className="h-10 rounded-lg px-4" disabled={isSubmitting} onClick={() => reset()}>
                {a.discardChanges}
              </Button>
            ) : null}
            <Button type="submit" size="sm" className="h-10 rounded-lg px-5" loading={isSubmitting} disabled={!isDirty}>
              {isSubmitting ? dict.ui.saving : a.saveChanges}
            </Button>
          </div>
        </form>

        {/* Preferences & Notifications card (clean switch rows like mobile & desktop settings) */}
        <aside className="account-clean-card account-preferences" aria-labelledby="account-preferences-title">
          <header className="border-b border-border/80 px-5 py-4 sm:px-6">
            <h2 id="account-preferences-title" className="flex items-center gap-2 text-[15.5px] font-semibold text-foreground">
              <Bell className="size-4 text-primary" aria-hidden="true" />
              {dict.accountUi.preferences}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{dict.accountUi.preferencesLead}</p>
          </header>

          <div className="divide-y divide-border/70 px-5 sm:px-6">
            <div className="account-preference account-preference-heading">
              <Mail aria-hidden="true" />
              <div>
                <NewsletterToggle customer={customer} />
              </div>
            </div>

            {/* Only when the API knows the setting (an older API leaves it out). */}
            {typeof customer.price_drop_alerts === "boolean" ? (
              <div className="account-preference account-preference-heading">
                <TrendingDown aria-hidden="true" />
                <div>
                  <PriceDropToggle customer={customer} />
                </div>
              </div>
            ) : null}

            {typeof customer.cart_reminders === "boolean" ? (
              <div className="account-preference account-preference-heading">
                <ShoppingBag aria-hidden="true" />
                <div>
                  <CartReminderToggle customer={customer} />
                </div>
              </div>
            ) : null}

            <div className="account-preference">
              <TelegramOrderUpdatesCard customer={customer} />
            </div>
          </div>
        </aside>
      </div>
    </AccountSection>
  );
}
