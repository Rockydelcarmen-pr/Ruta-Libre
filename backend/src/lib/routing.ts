import { config } from "../config.js";
import type { Coord, LatLng } from "./geo.js";

export interface RouteResult {
  coordinates: Coord[]; // [lng, lat]
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
}

/** Thrown when routing is unconfigured, unreachable, or returns no route. */
export class RoutingError extends Error {
  constructor(
    message: string,
    readonly code = "routing_error",
  ) {
    super(message);
    this.name = "RoutingError";
  }
}

/** A GeoJSON Polygon/MultiPolygon geometry passed to ORS `avoid_polygons`. */
export type GeoJsonGeometry = Record<string, unknown>;

interface OrsFeature {
  geometry: { type: "LineString"; coordinates: Coord[] };
  properties?: { summary?: { distance?: number; duration?: number } };
}
interface OrsResponse {
  features?: OrsFeature[];
  error?: { message?: string; code?: number } | string;
}

export interface RouteOptions {
  /** Request alternative routes (cannot be combined with avoidPolygon). */
  alternatives?: boolean;
  /** GeoJSON polygon(s) the route must avoid. */
  avoidPolygon?: GeoJsonGeometry | null;
}

/**
 * OpenRouteService directions. Returns the primary route first, followed by any
 * alternatives. Coordinates come back as GeoJSON [lng, lat] pairs directly (no
 * polyline decoding needed).
 */
export async function getRoutes(
  origin: LatLng,
  destination: LatLng,
  opts: RouteOptions = {},
): Promise<RouteResult[]> {
  if (!config.hasRoutingKey) {
    throw new RoutingError("ORS_API_KEY is not set", "routing_unconfigured");
  }

  const body: Record<string, unknown> = {
    coordinates: [
      [origin.lng, origin.lat],
      [destination.lng, destination.lat],
    ],
  };
  // ORS rejects alternative_routes together with avoid options, so they are
  // mutually exclusive here (which matches how the matcher uses them).
  if (opts.avoidPolygon) {
    body.options = { avoid_polygons: opts.avoidPolygon };
  } else if (opts.alternatives) {
    body.alternative_routes = {
      target_count: 3,
      share_factor: 0.6,
      weight_factor: 1.6,
    };
  }

  const url = `${config.ORS_BASE_URL}/v2/directions/${config.ORS_PROFILE}/geojson`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: config.ORS_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as OrsResponse | null;
  if (!res.ok) {
    const message =
      (data &&
        (typeof data.error === "string"
          ? data.error
          : data.error?.message)) ||
      `ORS HTTP ${res.status}`;
    throw new RoutingError(message, `ors_${res.status}`);
  }

  const features = data?.features ?? [];
  if (features.length === 0) {
    throw new RoutingError("No route found", "no_route_found");
  }

  return features.map((f) => ({
    coordinates: f.geometry.coordinates,
    summary: "",
    distanceMeters: Math.round(f.properties?.summary?.distance ?? 0),
    durationSeconds: Math.round(f.properties?.summary?.duration ?? 0),
  }));
}

interface OrsStepsResponse {
  features?: Array<{
    properties?: {
      segments?: Array<{ steps?: Array<{ name?: string }> }>;
    };
  }>;
}

/**
 * Best-effort ordered, deduped list of street names the route travels along.
 * Routes the organizer's drawn points (as waypoints, snapped to the road
 * network) through ORS and reads the turn-by-turn step names back out.
 * Never throws: returns [] if routing is unconfigured, unreachable, or the
 * points don't snap to a usable route. This is supplementary display data,
 * not something a save should ever be blocked on.
 */
export async function getRouteStreets(points: Coord[]): Promise<string[]> {
  if (!config.hasRoutingKey || points.length < 2) return [];

  try {
    const url = `${config.ORS_BASE_URL}/v2/directions/${config.ORS_PROFILE}/geojson`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: config.ORS_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/geo+json",
      },
      body: JSON.stringify({ coordinates: points, instructions: true }),
    });
    if (!res.ok) return [];

    const data = (await res.json().catch(() => null)) as OrsStepsResponse | null;
    const segments = data?.features?.[0]?.properties?.segments ?? [];

    const names: string[] = [];
    for (const segment of segments) {
      for (const step of segment.steps ?? []) {
        const name = step.name?.trim();
        // ORS uses "-" for unnamed ways; skip those and collapse consecutive
        // repeats (the same street can span several steps in a row).
        if (name && name !== "-" && names[names.length - 1] !== name) {
          names.push(name);
        }
      }
    }
    return names;
  } catch {
    return [];
  }
}
