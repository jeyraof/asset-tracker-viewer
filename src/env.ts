export interface Env {
  /** Existing asset database (asset-tracker-db). Queried read-only. */
  DB: D1Database;

  /** Viewer-owned auth database (asset-tracker-auth). */
  AUTH_DB: D1Database;

  /** Human-readable relying party name shown in passkey prompts. */
  RP_NAME: string;

  /**
   * Comma-separated list of accepted WebAuthn relying party IDs (domains).
   * Append a custom domain later; each registered passkey is stored per rp_id.
   */
  RP_IDS: string;

  /** Comma-separated list of accepted origins, e.g. "https://example.com". */
  ORIGINS: string;

  /** HMAC key used to sign the session cookie. Wrangler secret. */
  SESSION_SECRET: string;

  /** Required to register the first passkey. Wrangler secret. */
  SETUP_TOKEN: string;
}
