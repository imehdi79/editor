/**
 * pricingApi — the persistence boundary for a user's pricing settings.
 *
 * Pricing rates are per-user (not per-project): one set of billing rules saved
 * against the authenticated account. The store talks to this async interface;
 * every call routes through the shared `apiFetch` (auth header + error envelope
 * + 401 handling). `LocalPricingApi` is an in-memory offline fallback.
 */

import type { PricingSettings } from "@/store/pricing.store";
import { apiFetch, ApiError } from "@/api/client";

export interface PricingApi {
  /** The current user's saved pricing settings, or null if none saved yet. */
  get(): Promise<PricingSettings | null>;
  /** Upsert the current user's pricing settings. Returns the stored copy. */
  save(settings: PricingSettings): Promise<PricingSettings>;
}

const clone = <T>(v: T): T =>
  typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------
// In-memory implementation (offline fallback)
// ---------------------------------------------------------------------------

export class LocalPricingApi implements PricingApi {
  private settings: PricingSettings | null = null;

  async get(): Promise<PricingSettings | null> {
    return this.settings ? clone(this.settings) : null;
  }

  async save(settings: PricingSettings): Promise<PricingSettings> {
    this.settings = clone(settings);
    return clone(this.settings);
  }
}

// ---------------------------------------------------------------------------
// HTTP implementation — all calls authenticated via apiFetch
// ---------------------------------------------------------------------------

export class HttpPricingApi implements PricingApi {
  async get(): Promise<PricingSettings | null> {
    try {
      // 200 with `null` body (no settings yet) parses straight to null.
      return (await apiFetch<PricingSettings | null>("/pricing")) ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  save(settings: PricingSettings): Promise<PricingSettings> {
    return apiFetch<PricingSettings>("/pricing", { method: "PUT", body: settings });
  }
}

// Active instance — live against the backend.
export const pricingApi: PricingApi = new HttpPricingApi();
// export const pricingApi: PricingApi = new LocalPricingApi();
