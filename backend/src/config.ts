import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  ORS_API_KEY: z.string().default(""),
  ORS_BASE_URL: z.string().url().default("https://api.openrouteservice.org"),
  ORS_PROFILE: z.string().default("driving-car"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  // Set to the number of trusted proxy hops (or "true") in prod so req.ip is the
  // real client IP from X-Forwarded-For, not the load balancer. Leave false locally.
  TRUST_PROXY: z.string().default("false"),
  MATCH_BUFFER_METERS: z.coerce.number().positive().default(200),
  CHIP_TTL_MINUTES: z.coerce.number().int().positive().default(90),
  PARKING_RADIUS_METERS: z.coerce.number().positive().default(800),
  // Abuse guards (in-memory, per-process; use a shared store behind >1 instance).
  RATE_WINDOW_MINUTES: z.coerce.number().positive().default(60),
  CHIP_RATE_MAX_PER_DEVICE: z.coerce.number().int().positive().default(6),
  CHIP_RATE_MAX_PER_IP: z.coerce.number().int().positive().default(12),
  DEVICE_RATE_MAX_PER_IP: z.coerce.number().int().positive().default(8),
  // Coarse presence check: reject a chip if the request IP geolocates more than
  // this many km from the claimed spot. Generous + fail-open by design (see
  // lib/presence.ts). Disable with PRESENCE_CHECK_ENABLED=false.
  PRESENCE_CHECK_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  PRESENCE_MAX_KM: z.coerce.number().positive().default(500),
  OVERPASS_URL: z
    .string()
    .url()
    .default("https://overpass-api.de/api/interpreter"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const env = parsed.data;

function parseTrustProxy(v: string): boolean | number {
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  return Number.isFinite(n) ? n : false;
}

export const config = {
  ...env,
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  isProd: env.NODE_ENV === "production",
  hasRoutingKey: env.ORS_API_KEY.length > 0,
  trustProxy: parseTrustProxy(env.TRUST_PROXY),
};
