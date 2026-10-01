export interface User {
  id: number;
  email: string;
  role: "admin" | "customer";
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  address?: string | null;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  password: string;
}

export interface AuthSessionData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export type AuthUserResponse = ApiResponse<AuthSessionData>;
export type AuthAdminLoginResponse = ApiResponse<AuthSessionData>;

export interface BasicMessageResponse {
  status?: "success" | "error";
  message: string;
}

export interface ForgotPasswordResponse extends BasicMessageResponse {}

export interface RegisterResponse extends BasicMessageResponse {}
