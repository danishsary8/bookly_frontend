import { z } from "zod";
import { newPassword } from "@/features/auth/schemas";

/* Account forms; rules mirror bookly_backend_v2 ProfileController and AddressController. */

const phone = z
  .string()
  .trim()
  .max(30, "Keep the phone number under 30 characters.")
  .regex(/^[+\d\s()-]*$/, "Use digits, spaces, +, - or brackets only.");

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(150, "Keep your name under 150 characters."),
  phone,
});

/** current_password is required only when the account already has one (has_password). */
export const passwordSchema = (hasPassword: boolean) =>
  z
    .object({
      current_password: hasPassword ? z.string().min(1, "Enter your current password.") : z.string(),
      password: newPassword,
      password_confirmation: z.string().min(1, "Type your new password again."),
    })
    .refine((data) => data.password === data.password_confirmation, {
      path: ["password_confirmation"],
      message: "The passwords don't match.",
    });

const required = (what: string, max: number) =>
  z.string().trim().min(1, `Enter ${what}.`).max(max, `Keep it under ${max} characters.`);
const optional = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);

export const addressSchema = z.object({
  label: optional(50),
  recipient_name: required("the recipient's name", 150),
  phone: phone.min(1, "Enter a phone number for the courier."),
  address_line1: required("the street address", 255),
  address_line2: optional(255),
  city: required("the city", 100),
  state: optional(100),
  postal_code: optional(20),
  country: required("the country", 100),
  is_default: z.boolean(),
});

export type ProfileValues = z.infer<typeof profileSchema>;
export type PasswordValues = z.infer<ReturnType<typeof passwordSchema>>;
export type AddressValues = z.infer<typeof addressSchema>;
