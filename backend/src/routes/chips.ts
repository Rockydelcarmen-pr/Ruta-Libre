import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import {
  deleteChip,
  deleteChipAsAdmin,
  insertChip,
  markChipTaken,
  nearbyLiveChips,
} from "../db/parking.js";
import { rateLimit } from "../lib/rateLimit.js";
import { checkIpProximity } from "../lib/presence.js";

const WINDOW_MS = config.RATE_WINDOW_MINUTES * 60_000;

const nearQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(5000).optional(),
});

// A chip is dropped AT the reporter's current location — there is no separate
// "spot over there" field. lat/lng are the device's own GPS reading, so you can
// only ever plant a chip where you (claim to) are. Note: a browser's reported
// GPS is not cryptographically verifiable; this contract plus rate limiting
// raises the cost of spoofing but does not eliminate it (see docs/handoff.md).
const createChipSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  note: z.string().max(280).optional(),
});

export async function chipRoutes(app: FastifyInstance): Promise<void> {
  // Public: live (available, unexpired) chips near a point.
  app.get("/api/chips", async (req, reply) => {
    const parsed = nearQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const { lat, lng } = parsed.data;
    const radius = parsed.data.radius ?? config.PARKING_RADIUS_METERS;
    const chips = await nearbyLiveChips(lat, lng, radius);
    return reply.send({ chips });
  });

  // Anonymous device: drop a chip at a location.
  app.post(
    "/api/chips",
    { preHandler: app.authenticateDevice },
    async (req, reply) => {
      const parsed = createChipSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }

      // Abuse guard: cap chips per device and per IP within the window. A denied
      // attempt is not counted, so a blocked caller can't push their own reset out.
      for (const [key, max] of [
        [`chip:device:${req.deviceId}`, config.CHIP_RATE_MAX_PER_DEVICE],
        [`chip:ip:${req.ip}`, config.CHIP_RATE_MAX_PER_IP],
      ] as const) {
        const gate = rateLimit(key, max, WINDOW_MS);
        if (!gate.allowed) {
          reply.header("retry-after", gate.retryAfterSeconds);
          return reply.code(429).send({
            error: "rate_limited",
            retry_after_seconds: gate.retryAfterSeconds,
          });
        }
      }

      const d = parsed.data;

      // Coarse presence check: the request IP should geolocate near the spot the
      // chip claims. Fail-open on unknown IPs; only rejects gross mismatches.
      if (config.PRESENCE_CHECK_ENABLED) {
        const presence = checkIpProximity(
          req.ip,
          d.lat,
          d.lng,
          config.PRESENCE_MAX_KM,
        );
        if (!presence.ok) {
          req.log.info(
            { ip: req.ip, distanceKm: presence.distanceKm },
            "chip rejected: IP too far from claimed location",
          );
          return reply.code(403).send({
            error: "location_mismatch",
            message:
              "Your connection appears to be far from this spot. Drop a chip only where you actually are.",
          });
        }
      }

      const chip = await insertChip({
        lat: d.lat,
        lng: d.lng,
        note: d.note ?? null,
        reportedBy: req.deviceId!,
        ttlMinutes: config.CHIP_TTL_MINUTES,
      });
      return reply.code(201).send(chip);
    },
  );

  // Anonymous device: mark a chip taken (removes it from the live layer for
  // everyone). Any device may do this; grabbing the spot is a community action.
  app.post(
    "/api/chips/:id/taken",
    { preHandler: app.authenticateDevice },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await markChipTaken(id, req.deviceId!);
      if (!ok) return reply.code(404).send({ error: "chip_not_live" });
      return reply.send({ ok: true });
    },
  );

  // Anonymous device: delete your own chip (the device that dropped it).
  app.delete(
    "/api/chips/:id",
    { preHandler: app.authenticateDevice },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await deleteChip(id, req.deviceId!);
      if (!ok) return reply.code(404).send({ error: "not_found_or_forbidden" });
      return reply.send({ ok: true });
    },
  );

  // Admin: remove any chip, regardless of who reported it or where it is.
  app.delete(
    "/api/chips/:id/admin",
    { preHandler: app.requireRole(["admin"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await deleteChipAsAdmin(id);
      if (!ok) return reply.code(404).send({ error: "not_found" });
      return reply.send({ ok: true });
    },
  );
}
