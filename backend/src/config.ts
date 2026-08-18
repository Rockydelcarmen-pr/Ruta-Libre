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
  MATCH_BUFFER_METERS: z.coerce.number().positive().default(200),
  CHIP_TTL_MINUTES: z.coerce.number().int().positive().default(90),
  PARKING_RADIUS_METERS: z.coerce.number().positive().default(800),
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

export const config = {
  ...env,
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  isProd: env.NODE_ENV === "production",
  hasRoutingKey: env.ORS_API_KEY.length > 0,
};
