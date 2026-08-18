import { createHash, randomBytes } from "node:crypto";

/** Generate a high-entropy, URL-safe access key (shown to the admin once). */
export function generateAccessKey(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Hash an access key for storage/lookup. Keys are high-entropy, so a fast
 * sha256 is appropriate here (unlike passwords) and lets us look up by hash.
 */
export function hashAccessKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
