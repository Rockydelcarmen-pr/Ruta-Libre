import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import {
  deleteChip,
  insertChip,
  markChipTaken,
  nearbyLiveChips,
} from "../db/parking.js";

const nearQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(5000).optional(),
});

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

  // Logged-in: drop a chip at a location.
  app.post(
    "/api/chips",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const parsed = createChipSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const d = parsed.data;
      const chip = await insertChip({
        lat: d.lat,
        lng: d.lng,
        note: d.note ?? null,
        reportedBy: req.user.sub,
        ttlMinutes: config.CHIP_TTL_MINUTES,
      });
      return reply.code(201).send(chip);
    },
  );

  // Logged-in: mark a chip taken (removes it from the live layer for everyone).
  app.post(
    "/api/chips/:id/taken",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await markChipTaken(id, req.user.sub);
      if (!ok) return reply.code(404).send({ error: "chip_not_live" });
      return reply.send({ ok: true });
    },
  );

  // Logged-in: delete your own chip (admins can delete any).
  app.delete(
    "/api/chips/:id",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const ok = await deleteChip(id, req.user.sub, req.user.role === "admin");
      if (!ok) return reply.code(404).send({ error: "not_found_or_forbidden" });
      return reply.send({ ok: true });
    },
  );
}
