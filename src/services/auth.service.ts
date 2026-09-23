import api from "../api/axios";
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  setSession,
  updateStoredUser,
} from "../lib/session";
import type {
  AuthAdminLoginResponse,
  AuthUserResponse,
  BasicMessageResponse,
  ForgotPasswordResponse,
  LoginCredentials,
  RegisterData,
  RegisterResponse,
  User,
} from "../types/auth.types";

const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthUserResponse> => {
    const response = await api.post<AuthUserResponse>("/customers/login", credentials);
    setSession(response.data.data);
    return response.data;
  },

  adminLogin: async (credentials: LoginCredentials): Promise<AuthAdminLoginResponse> => {
    const response = await api.post<AuthAdminLoginResponse>("/admin/login", credentials);
    setSession(response.data.data);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>("/customers/register", userData);
    return response.data;
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await api.post<BasicMessageResponse>("/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Clearing local session is still required even if the server call fails.
      }
    }

    clearSession();
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<{ status: string; data: User }>("/auth/me");
    updateStoredUser(response.data.data);
    return response.data.data;
  },

  getStoredUser,

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>("/customers/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<BasicMessageResponse> => {
    const response = await api.post<BasicMessageResponse>("/customers/reset-password", {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
};

export default authService;
