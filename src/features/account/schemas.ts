import { z } from "zod";
import { newPassword } from "@/features/auth/schemas";
import { msg, type Translations } from "@/i18n";

/* Account forms; rules mirror bookly_backend_v2 ProfileController and AddressController. */

const phone = z
  .string()
  .trim()
  .max(30, msg((d) => d.forms.phoneTooLong))
  .regex(/^[+\d\s()-]*$/, msg((d) => d.forms.phoneChars));

export const profileSchema = z.object({
  name: z.string().trim().min(1, msg((d) => d.forms.enterName)).max(150, msg((d) => d.forms.nameTooLong)),
  phone,
});

/** current_password is required only when the account already has one (has_password). */
export const passwordSchema = (hasPassword: boolean) =>
  z
    .object({
      current_password: hasPassword ? z.string().min(1, msg((d) => d.forms.enterCurrentPassword)) : z.string(),
      password: newPassword,
      password_confirmation: z.string().min(1, msg((d) => d.forms.typeNewPasswordAgain)),
    })
    .refine((data) => data.password === data.password_confirmation, {
      path: ["password_confirmation"],
      ...msg((d) => d.forms.passwordsDontMatch),
    });

const required = (empty: (d: Translations) => string, max: number) =>
  z.string().trim().min(1, msg(empty)).max(max, msg((d) => d.forms.under(max)));
const optional = (max: number) => z.string().trim().max(max, msg((d) => d.forms.under(max)));

export const addressSchema = z.object({
  label: optional(50),
  recipient_name: required((d) => d.forms.enterRecipient, 150),
  phone: phone.min(1, msg((d) => d.forms.enterCourierPhone)),
  address_line1: required((d) => d.forms.enterStreet, 255),
  address_line2: optional(255),
  city: required((d) => d.forms.enterCity, 100),
  state: optional(100),
  postal_code: optional(20),
  country: required((d) => d.forms.enterCountry, 100),
  is_default: z.boolean(),
});

export type ProfileValues = z.infer<typeof profileSchema>;
export type PasswordValues = z.infer<ReturnType<typeof passwordSchema>>;
export type AddressValues = z.infer<typeof addressSchema>;
