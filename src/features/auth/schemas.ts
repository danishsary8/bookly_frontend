import { z } from "zod";

/*
 * Client-side rules for the customer auth forms. They mirror the API's validation
 * (bookly_backend_v2 Customer/AuthController) so most mistakes are caught before a
 * request; the API stays the source of truth and its 422 messages are shown too.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(190, "That email address is too long.")
  .email("Enter an email address like name@example.com.");

// API: Password::min(8)->letters()->numbers()
export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/\p{L}/u, "Include at least one letter.")
  .regex(/\p{N}/u, "Include at least one number.");

const code = z
  .string()
  .regex(/^\d{6}$/, "Enter the 6-digit code we sent you.");

// API: Cambodian numbers only (+855), e.g. "012 345 678" or "+855 12 345 678".
const CAMBODIAN_PHONE = /^(\+?855|0)?[1-9]\d{6,8}$/;
export const cambodianPhone = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .refine((v) => CAMBODIAN_PHONE.test(v.replace(/[\s()-]/g, "")), "Enter a Cambodian phone number, like 012 345 678.");

export const optionalEmail = z
  .string()
  .trim()
  .max(190, "That email address is too long.")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter an email address like name@example.com.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

// Owner (2026-10-08): with a Telegram code the phone proves the account, so the email is optional then.
export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(150, "Keep your name under 150 characters."),
    email: optionalEmail,
    phone: z
      .string()
      .trim()
      .max(30, "Keep the phone number under 30 characters.")
      .regex(/^[+\d\s()-]*$/, "Use digits, spaces, +, - or brackets only."),
    password: newPassword,
    password_confirmation: z.string().min(1, "Type your password again."),
    verify_by: z.enum(["email", "telegram"]),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords don't match.",
  })
  .superRefine((data, ctx) => {
    if (data.verify_by !== "telegram") {
      if (data.email === "") ctx.addIssue({ code: "custom", path: ["email"], message: "Enter your email address." });
      return;
    }
    const phone = cambodianPhone.safeParse(data.phone);
    if (!phone.success) ctx.addIssue({ code: "custom", path: ["phone"], message: phone.error.issues[0].message });
  });

/** A new Facebook customer's details (owner's rule: phone required, email optional). */
export const facebookDetailsSchema = z.object({ phone: cambodianPhone, email: optionalEmail });

/** Account → Sign-in & security: a number to verify with Telegram. */
export const phoneSchema = z.object({ phone: cambodianPhone });

export const verifyEmailSchema = z.object({ code });

/** Account → Sign-in & security: a new email, and the password when the account has one. */
export const changeEmailSchema = (hasPassword: boolean) =>
  z.object({ email, password: hasPassword ? z.string().min(1, "Enter your password.") : z.string() });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    email,
    code,
    password: newPassword,
    password_confirmation: z.string().min(1, "Type your new password again."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords don't match.",
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
export type FacebookDetailsValues = z.infer<typeof facebookDetailsSchema>;
export type PhoneValues = z.infer<typeof phoneSchema>;
export type ChangeEmailValues = z.infer<ReturnType<typeof changeEmailSchema>>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Password checklist shown under "new password" fields, so the rules are visible before an error. */
export const passwordRules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "A letter", test: (v: string) => /\p{L}/u.test(v) },
  { label: "A number", test: (v: string) => /\p{N}/u.test(v) },
];
