import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a high-entropy, URL-safe device token. The plaintext is returned to
 * the client once (stored on-device) and never persisted server-side.
 */
export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a device token for storage/lookup. Tokens are high-entropy, so a fast
 * sha256 is appropriate here (unlike passwords) and lets us look up by hash.
 */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
