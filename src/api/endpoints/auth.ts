import { api } from "../client";
import { clearSession, setSession, updateSessionUser } from "../session";
import type { Customer, LoginResponse, MessageResponse } from "../types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

const startSession = (response: LoginResponse) => {
  setSession<Customer>("customer", { token: response.token!, expiresAt: response.expires_at ?? null, user: response.customer });
  return response;
};

export const authApi = {
  register: (input: RegisterInput) => api.post<LoginResponse & { message: string }>("/auth/register", input).then(startSession),
  login: (email: string, password: string) => api.post<LoginResponse>("/auth/login", { email, password }).then(startSession),
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
  resendVerification: () => api.post<MessageResponse>("/auth/resend-verification"),
  forgotPassword: (email: string) => api.post<MessageResponse>("/auth/forgot-password", { email }),
  resetPassword: (input: { email: string; code: string; password: string; password_confirmation: string }) =>
    api.post<MessageResponse>("/auth/reset-password", input),
};
