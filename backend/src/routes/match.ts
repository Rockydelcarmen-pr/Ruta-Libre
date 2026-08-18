import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import {
  findConflicts,
  getAvoidPolygon,
  getOrgLinksFor,
} from "../db/protests.js";
import { getRoutes, RoutingError, type RouteResult } from "../lib/routing.js";
import { toLineString, type Coord } from "../lib/geo.js";
import { serializeProtest, type Row } from "../lib/serialize.js";
import { normalizeLang, type Lang } from "../lib/i18n.js";
import { googleCalendarLink } from "../lib/calendar.js";

const point = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const matchSchema = z.object({
  origin: point,
  destination: point,
  lang: z.enum(["en", "es"]).optional(),
});

function routeToJson(r: RouteResult) {
  return {
    geojson: toLineString(r.coordinates),
    summary: r.summary,
    distance_meters: r.distanceMeters,
    duration_seconds: r.durationSeconds,
  };
}

async function conflictsForCoords(coords: Coord[]): Promise<Row[]> {
  const geojson = JSON.stringify(toLineString(coords));
  return findConflicts(geojson, config.MATCH_BUFFER_METERS);
}

function calendarLinksFor(protest: {
  id: string;
  title: string | null;
  cause: string | null;
  description: string | null;
  event_date: unknown;
  start_time: unknown;
  estimated_duration_minutes: number | null;
  external_links: unknown;
}) {
  return {
    google: googleCalendarLink({
      title: protest.title ?? "Protest",
      description: protest.cause ?? protest.description,
      externalLinks: Array.isArray(protest.external_links)
        ? (protest.external_links as string[])
        : [],
      eventDate: String(protest.event_date),
      startTime: protest.start_time ? String(protest.start_time) : null,
      durationMinutes: protest.estimated_duration_minutes,
    }),
    ics_download_url: `/api/protests/${protest.id}/calendar.ics`,
  };
}

export async function matchRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/protests/match", async (req, reply) => {
    const parsed = matchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const { origin, destination } = parsed.data;
    const lang: Lang = normalizeLang(parsed.data.lang);

    let routes: RouteResult[];
    try {
      routes = await getRoutes(origin, destination, { alternatives: true });
    } catch (err) {
      if (err instanceof RoutingError) {
        const unconfigured = err.code === "routing_unconfigured";
        return reply
          .code(unconfigured ? 503 : 502)
          .send({ error: err.code, message: err.message });
      }
      throw err;
    }

    const primary = routes[0]!; // getRoutes throws if there are no routes.
    const conflicts = await conflictsForCoords(primary.coordinates);

    if (conflicts.length === 0) {
      return reply.send({
        conflict: false,
        protest: null,
        protests: [],
        suggested_route: routeToJson(primary),
        suggested_route_has_conflict: false,
        calendar_links: null,
      });
    }

    // Prefer a clean existing alternative; otherwise ask the router to avoid the
    // conflicting protest area(s) directly.
    let suggested: RouteResult | null = null;
    for (const alt of routes.slice(1)) {
      if ((await conflictsForCoords(alt.coordinates)).length === 0) {
        suggested = alt;
        break;
      }
    }
    if (!suggested) {
      const avoid = await getAvoidPolygon(
        conflicts.map((c) => c.id as string),
        config.MATCH_BUFFER_METERS,
      );
      if (avoid) {
        try {
          const detours = await getRoutes(origin, destination, {
            avoidPolygon: avoid,
          });
          suggested = detours[0] ?? null;
        } catch (err) {
          if (!(err instanceof RoutingError)) throw err;
          // No avoiding route available; leave suggested null.
        }
      }
    }

    const suggestedHasConflict = suggested
      ? (await conflictsForCoords(suggested.coordinates)).length > 0
      : true;

    const serialized = await Promise.all(
      conflicts.map(async (row) =>
        serializeProtest(row, lang, await getOrgLinksFor(row.id as string)),
      ),
    );
    const primaryConflict = serialized[0]!;

    return reply.send({
      conflict: true,
      protest: primaryConflict,
      protests: serialized,
      requested_route: routeToJson(primary),
      suggested_route: suggested ? routeToJson(suggested) : null,
      suggested_route_has_conflict: suggestedHasConflict,
      calendar_links: calendarLinksFor(primaryConflict),
    });
  });
}
