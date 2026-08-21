import { query } from "./pool.js";
import { generateDeviceToken, hashDeviceToken } from "../lib/deviceToken.js";

/**
 * Mint a new anonymous device identity. Returns the device id plus the plaintext
 * token (shown to the client once; only its hash is stored).
 */
export async function createDeviceToken(): Promise<{
  id: string;
  token: string;
}> {
  const token = generateDeviceToken();
  const res = await query<{ id: string }>(
    "insert into device_tokens (token_hash) values ($1) returning id",
    [hashDeviceToken(token)],
  );
  return { id: res.rows[0]!.id, token };
}

/**
 * Resolve a plaintext device token to its device id, touching last_seen_at.
 * Returns null if the token is unknown.
 */
export async function resolveDeviceId(token: string): Promise<string | null> {
  const res = await query<{ id: string }>(
    `update device_tokens set last_seen_at = now()
     where token_hash = $1
     returning id`,
    [hashDeviceToken(token)],
  );
  return res.rows[0]?.id ?? null;
}
