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
  .regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(150, "Keep your name under 150 characters."),
    email,
    phone: z
      .string()
      .trim()
      .max(30, "Keep the phone number under 30 characters.")
      .regex(/^[+\d\s()-]*$/, "Use digits, spaces, +, - or brackets only."),
    password: newPassword,
    password_confirmation: z.string().min(1, "Type your password again."),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords don't match.",
  });

export const verifyEmailSchema = z.object({ code });

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
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Password checklist shown under "new password" fields, so the rules are visible before an error. */
export const passwordRules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "A letter", test: (v: string) => /\p{L}/u.test(v) },
  { label: "A number", test: (v: string) => /\p{N}/u.test(v) },
];
