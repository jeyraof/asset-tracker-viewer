import type { AuthenticatorTransport } from "@simplewebauthn/server";

export interface StoredCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransport[];
  deviceType?: string;
  backedUp: boolean;
  rpId: string;
  label: string | null;
}

export type ChallengeKind = "registration" | "authentication";

interface CredentialRow {
  id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  device_type: string | null;
  backed_up: number;
  rp_id: string;
  label: string | null;
}

function parseTransports(value: string | null): AuthenticatorTransport[] | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as AuthenticatorTransport[];
  } catch {
    return undefined;
  }
  return undefined;
}

function mapCredential(row: CredentialRow): StoredCredential {
  return {
    id: row.id,
    publicKey: row.public_key,
    counter: row.counter,
    transports: parseTransports(row.transports),
    deviceType: row.device_type ?? undefined,
    backedUp: row.backed_up === 1,
    rpId: row.rp_id,
    label: row.label,
  };
}

export async function listCredentials(db: D1Database): Promise<StoredCredential[]> {
  const { results } = await db
    .prepare(
      `SELECT id, public_key, counter, transports, device_type, backed_up, rp_id, label
         FROM passkey_credentials ORDER BY created_at ASC`,
    )
    .all<CredentialRow>();
  return (results ?? []).map(mapCredential);
}

export async function countCredentials(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM passkey_credentials")
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getCredential(
  db: D1Database,
  id: string,
): Promise<StoredCredential | null> {
  const row = await db
    .prepare(
      `SELECT id, public_key, counter, transports, device_type, backed_up, rp_id, label
         FROM passkey_credentials WHERE id = ?`,
    )
    .bind(id)
    .first<CredentialRow>();
  return row ? mapCredential(row) : null;
}

export async function insertCredential(db: D1Database, credential: StoredCredential): Promise<void> {
  await db
    .prepare(
      `INSERT INTO passkey_credentials
         (id, public_key, counter, transports, device_type, backed_up, rp_id, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         public_key = excluded.public_key,
         counter = excluded.counter,
         transports = excluded.transports,
         device_type = excluded.device_type,
         backed_up = excluded.backed_up,
         rp_id = excluded.rp_id,
         label = excluded.label`,
    )
    .bind(
      credential.id,
      credential.publicKey,
      credential.counter,
      credential.transports ? JSON.stringify(credential.transports) : null,
      credential.deviceType ?? null,
      credential.backedUp ? 1 : 0,
      credential.rpId,
      credential.label,
    )
    .run();
}

export async function updateCredentialAfterUse(
  db: D1Database,
  id: string,
  counter: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE passkey_credentials
          SET counter = ?, last_used_at = datetime('now')
        WHERE id = ?`,
    )
    .bind(counter, id)
    .run();
}

export async function putChallenge(
  db: D1Database,
  id: string,
  kind: ChallengeKind,
  challenge: string,
  ttlSeconds: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO webauthn_challenges (id, kind, challenge, expires_at)
       VALUES (?, ?, ?, datetime('now', ?))`,
    )
    .bind(id, kind, challenge, `+${ttlSeconds} seconds`)
    .run();
}

/** Reads and consumes a challenge, returning null when missing, expired, or of the wrong kind. */
export async function takeChallenge(
  db: D1Database,
  id: string,
  kind: ChallengeKind,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT id, challenge FROM webauthn_challenges
        WHERE id = ? AND kind = ? AND expires_at > datetime('now')`,
    )
    .bind(id, kind)
    .first<{ id: string; challenge: string }>();

  await db
    .prepare("DELETE FROM webauthn_challenges WHERE id = ? OR expires_at <= datetime('now')")
    .bind(id)
    .run();

  return row?.challenge ?? null;
}
