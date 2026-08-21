import type { FastifyInstance } from "fastify";
import { createDeviceToken } from "../db/devices.js";
import { config } from "../config.js";
import { rateLimit } from "../lib/rateLimit.js";

const WINDOW_MS = config.RATE_WINDOW_MINUTES * 60_000;

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  // Mint an anonymous device token. The app calls this once on first use and
  // stores the token on-device; it carries no personal data. Used to attribute
  // community parking chips without an email/password account. Rate-limited per
  // IP so nobody can mint tokens in bulk to sidestep chip limits.
  app.post("/api/devices", async (req, reply) => {
    const gate = rateLimit(
      `device:ip:${req.ip}`,
      config.DEVICE_RATE_MAX_PER_IP,
      WINDOW_MS,
    );
    if (!gate.allowed) {
      reply.header("retry-after", gate.retryAfterSeconds);
      return reply.code(429).send({
        error: "rate_limited",
        retry_after_seconds: gate.retryAfterSeconds,
      });
    }
    const { token } = await createDeviceToken();
    return reply.code(201).send({ device_token: token });
  });
}
