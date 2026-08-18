import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import { insertParkingSpot, nearbyParkingSpots } from "../db/parking.js";
import { fetchOsmParking } from "../lib/parking.js";

const nearQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(5000).optional(),
});

const createSpotSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().min(1).optional(),
  kind: z.enum(["lot", "street", "garage", "other"]).optional(),
  capacity: z.number().int().min(0).optional(),
  notes_en: z.string().optional(),
  notes_es: z.string().optional(),
});

export async function parkingRoutes(app: FastifyInstance): Promise<void> {
  // Public: legal parking near a point, merging admin-curated spots with live OSM.
  app.get("/api/parking", async (req, reply) => {
    const parsed = nearQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const { lat, lng } = parsed.data;
    const radius = parsed.data.radius ?? config.PARKING_RADIUS_METERS;

    const [curated, osm] = await Promise.all([
      nearbyParkingSpots(lat, lng, radius),
      fetchOsmParking(lat, lng, radius),
    ]);

    const spots = [
      ...curated.map((s) => ({
        source: "admin" as const,
        id: s.id,
        name: s.name,
        kind: s.kind,
        lat: s.lat,
        lng: s.lng,
        capacity: s.capacity,
        notes_en: s.notes_en,
        notes_es: s.notes_es,
      })),
      ...osm.map((o) => ({
        source: "osm" as const,
        id: o.osm_id,
        name: o.name,
        kind: o.kind,
        lat: o.lat,
        lng: o.lng,
        capacity: null,
        notes_en: null,
        notes_es: null,
      })),
    ];

    return reply.send({ spots });
  });

  // Admin: add an authoritative legal parking spot.
  app.post(
    "/api/parking",
    { preHandler: app.requireRole(["admin"]) },
    async (req, reply) => {
      const parsed = createSpotSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const d = parsed.data;
      const spot = await insertParkingSpot({
        name: d.name ?? null,
        kind: d.kind ?? "lot",
        lat: d.lat,
        lng: d.lng,
        capacity: d.capacity ?? null,
        notes_en: d.notes_en ?? null,
        notes_es: d.notes_es ?? null,
        createdBy: req.user.sub,
      });
      return reply.code(201).send(spot);
    },
  );
}
