import axios from "axios";

import { clearSession, getAccessToken, getRefreshToken, setSession } from "../lib/session";
import type { AuthUserResponse } from "../types/auth.types";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

const resolvePendingRequests = (token: string) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearSession();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<AuthUserResponse>(`${baseURL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        setSession(refreshResponse.data.data);
        const nextToken = refreshResponse.data.data.access_token;
        resolvePendingRequests(nextToken);
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      const message = error.response.data?.message || error.response.statusText || "Something went wrong";
      console.error(`[API Error]: ${message} (Status: ${error.response.status})`);
    } else if (error.request) {
      console.error("[API Error]: No response from server");
    } else {
      console.error("[API Error]:", error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
