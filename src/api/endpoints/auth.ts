import { api } from "../client";
import { clearSession, setSession, updateSessionUser } from "../session";
import type { Customer, LoginResponse, MessageResponse } from "../types";

export interface RegisterInput {
  name: string;
  /** Optional when `verify_by` is "telegram": the phone number proves the account. */
  email?: string;
  password: string;
  password_confirmation: string;
  /** A contact number (email sign-ups only; with Telegram the bot gives the proven number). */
  phone?: string;
  /** How the account is confirmed: a 6-digit email code, or the phone number shared in the Telegram bot. */
  verify_by?: VerifyChannel;
  turnstile_token?: string;
}

export type VerifyChannel = "email" | "telegram";

/** How the new account is confirmed next; null when nothing needs confirming. */
export type SignUpResponse = LoginResponse & { message?: string; verify_by?: VerifyChannel | null };

/** A new Facebook customer's second step: confirm a phone number in Telegram, or give an email. */
export interface FacebookDetails {
  verify_by: VerifyChannel;
  email?: string;
  turnstile_token?: string;
}

/** A one-time link to the Bookly Telegram bot: open `url`; `key` (private to this browser) reads the result. */
export interface TelegramLink {
  url: string;
  key: string;
  expires_at: string;
}

export type TelegramStatus =
  | { status: "pending"; expires_at?: string }
  | { status: "failed"; message: string }
  | ({ status: "done"; customer: Customer } & Partial<LoginResponse>);

/** The Cloudflare Turnstile token, sent only when there is one (the check is off until it's configured). */
const withToken = (turnstileToken?: string) => (turnstileToken ? { turnstile_token: turnstileToken } : {});

const startSession = <T extends LoginResponse>(response: T): T => {
  setSession<Customer>("customer", { token: response.token!, expiresAt: response.expires_at ?? null, user: response.customer });
  return response;
};

export const authApi = {
  register: (input: RegisterInput) => api.post<SignUpResponse>("/auth/register", input).then(startSession),
  /** What sign-up and sign-in can offer right now (Telegram switches on with the API's bot token). */
  options: () => api.get<{ telegram: boolean }>("/auth/options"),
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
  /** A new email code. */
  resendVerification: (turnstileToken?: string) => api.post<MessageResponse>("/auth/resend-verification", withToken(turnstileToken)),
  telegram: {
    /** "Continue with Telegram" on the sign-in page. */
    signIn: () => api.post<TelegramLink>("/auth/telegram"),
    /** A signed-in customer confirms (or changes) their number. */
    confirmPhone: () => api.post<TelegramLink>("/auth/telegram/phone"),
    /** How it went: a sign-in starts the session; a confirmed number refreshes the stored profile. */
    status: async (key: string) => {
      const response = await api.post<TelegramStatus>("/auth/telegram/status", { key });
      if (response.status === "done") {
        if (response.token) startSession(response as LoginResponse);
        else updateSessionUser("customer", response.customer);
      }
      return response;
    },
  },
  forgotPassword: (email: string, turnstileToken?: string) => api.post<MessageResponse>("/auth/forgot-password", { email, ...withToken(turnstileToken) }),
  resetPassword: (input: { email: string; code: string; password: string; password_confirmation: string }) =>
    api.post<MessageResponse>("/auth/reset-password", input),
};
