/**
 * client — the single fetch chokepoint for the backend.
 *
 * Responsibilities:
 *   - prepend the API base URL (VITE_API_URL)
 *   - attach `Authorization: Bearer <token>` on authed calls
 *   - parse the backend error envelope `{ error: { message, issues? } }` into a
 *     typed `ApiError` that carries the server message to the UI
 *   - on a 401 from an authed call, clear the token (→ treated as logged-out)
 */

import { getToken, clearToken } from "./tokenStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

interface ApiErrorBody {
  error?: { message?: string; issues?: string[] };
}

export class ApiError extends Error {
  readonly status: number;
  readonly issues?: string[];

  constructor(status: number, message: string, issues?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /**
   * Attach the bearer token and treat a 401 as "logged out" (clears the token).
   * Set false for login/register, where a 401 is just bad credentials.
   * Default true.
   */
  auth?: boolean;
}

const buildUrl = (path: string) => `${API_URL.replace(/\/$/, "")}${path}`;

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const token = auth ? getToken() : null;
  if (token) headers["authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Network error — is the backend reachable?");
  }

  // Invalid/expired token on an authed call → drop it; subscribers log out.
  if (auth && res.status === 401) clearToken();

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
  }

  if (!res.ok) {
    const envelope = payload as ApiErrorBody | null;
    const message = envelope?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, envelope?.error?.issues);
  }

  return payload as T;
}
