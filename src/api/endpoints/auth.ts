import { api } from "../client";
import { clearSession, setSession, updateSessionUser } from "../session";
import type { Customer, LoginResponse, MessageResponse } from "../types";

export interface RegisterInput {
  name: string;
  /** Optional when `verify_by` is "telegram": the phone proves the account. */
  email?: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  /** Where the 6-digit code goes; "telegram" needs `phone` (Cambodian numbers). */
  verify_by?: VerifyChannel;
  turnstile_token?: string;
}

export type VerifyChannel = "email" | "telegram";

/** Where the API sent the account's first code; null when nothing needs verifying. */
export type SignUpResponse = LoginResponse & { message?: string; verify_by?: VerifyChannel | null };

/** A new Facebook customer's second step: their phone number, and an email if they want one. */
export interface FacebookDetails {
  phone: string;
  email?: string;
  turnstile_token?: string;
}

/** The Cloudflare Turnstile token, sent only when there is one (the check is off until it's configured). */
const withToken = (turnstileToken?: string) => (turnstileToken ? { turnstile_token: turnstileToken } : {});

const startSession = <T extends LoginResponse>(response: T): T => {
  setSession<Customer>("customer", { token: response.token!, expiresAt: response.expires_at ?? null, user: response.customer });
  return response;
};

export const authApi = {
  register: (input: RegisterInput) => api.post<SignUpResponse>("/auth/register", input).then(startSession),
  /** What sign-up can offer right now (Telegram codes switch on with the API's gateway token). */
  options: () => api.get<{ telegram_codes: boolean }>("/auth/options"),
  login: (email: string, password: string, turnstileToken?: string) =>
    api.post<LoginResponse>("/auth/login", { email, password, ...withToken(turnstileToken) }).then(startSession),
  /** Signs in (or up) with a Google / Facebook access token; the API checks it with the provider. */
  social: (provider: "google" | "facebook", accessToken: string, details?: FacebookDetails) =>
    api.post<SignUpResponse>(`/auth/social/${provider}`, { access_token: accessToken, ...details }).then(startSession),
  /** Revokes the token on the server; the local session ends even if that request fails. */
  logout: async () => {
    try {
      await api.post<MessageResponse>("/auth/logout");
    } finally {
      clearSession("customer");
    }
  },
  /** Marks the email verified and refreshes the stored profile (`email_verified` becomes true). */
  verifyEmail: async (code: string) => {
    const response = await api.post<MessageResponse & { customer?: Customer }>("/auth/verify-email", { code });
    if (response.customer) updateSessionUser("customer", response.customer);
    return response;
  },
  resendVerification: (turnstileToken?: string, channel: VerifyChannel = "email") =>
    api.post<MessageResponse>("/auth/resend-verification", { channel, ...withToken(turnstileToken) }),
  /** Sends a Telegram code to a new number; the account keeps its old number until the code comes back. */
  sendPhoneCode: (phone: string, turnstileToken?: string) =>
    api.post<MessageResponse & { phone?: string }>("/auth/phone", { phone, ...withToken(turnstileToken) }),
  /** Saves the number as verified and refreshes the stored profile. */
  verifyPhone: async (code: string) => {
    const response = await api.post<MessageResponse & { customer?: Customer }>("/auth/verify-phone", { code });
    if (response.customer) updateSessionUser("customer", response.customer);
    return response;
  },
  /** Sign in with a phone number, step 1: the API answers the same whether or not the number has an account. */
  phoneLogin: (phone: string, turnstileToken?: string) =>
    api.post<MessageResponse & { phone?: string }>("/auth/phone-login", { phone, ...withToken(turnstileToken) }),
  /** Step 2: the Telegram code signs in like a password. */
  phoneLoginVerify: (phone: string, code: string) => api.post<LoginResponse>("/auth/phone-login/verify", { phone, code }).then(startSession),
  forgotPassword: (email: string, turnstileToken?: string) => api.post<MessageResponse>("/auth/forgot-password", { email, ...withToken(turnstileToken) }),
  resetPassword: (input: { email: string; code: string; password: string; password_confirmation: string }) =>
    api.post<MessageResponse>("/auth/reset-password", input),
};
