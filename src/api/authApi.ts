/**
 * authApi — register / login / me against the backend auth endpoints.
 *
 * login & register are unauthenticated (a 401 there means bad credentials, not
 * a session expiry), so they pass `auth: false`. `me()` validates the stored
 * token. All throw `ApiError` carrying the server's `error.message` / `issues`.
 */

import { apiFetch } from "./client";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  userId: string;
  email: string;
}

export const authApi = {
  register: (email: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: { email, password }, auth: false }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }),

  me: (): Promise<MeResponse> => apiFetch<MeResponse>("/auth/me", { method: "GET", auth: true }),
};
