import { config } from "../config.js";
import { decodePolyline, type Coord, type LatLng } from "./geo.js";

export interface DirectionsRoute {
  polyline: string;
  coordinates: Coord[];
  summary: string;
  distanceMeters: number;
  durationSeconds: number;
}

/** Thrown when the Directions API is unreachable, unconfigured, or returns a non-OK status. */
export class DirectionsError extends Error {
  constructor(
    message: string,
    readonly code = "directions_error",
  ) {
    super(message);
    this.name = "DirectionsError";
  }
}

interface GDirectionsResponse {
  status: string;
  error_message?: string;
  routes: Array<{
    summary?: string;
    overview_polyline: { points: string };
    legs?: Array<{
      distance?: { value: number };
      duration?: { value: number };
    }>;
  }>;
}

function sumLegs(
  legs: GDirectionsResponse["routes"][number]["legs"],
  field: "distance" | "duration",
): number {
  if (!legs) return 0;
  return legs.reduce((total, leg) => total + (leg[field]?.value ?? 0), 0);
}

export interface RouteOptions {
  alternatives?: boolean;
  waypoints?: LatLng[];
}

export async function getRoutes(
  origin: LatLng,
  destination: LatLng,
  opts: RouteOptions = {},
): Promise<DirectionsRoute[]> {
  if (!config.hasDirectionsKey) {
    throw new DirectionsError(
      "GOOGLE_DIRECTIONS_API_KEY is not set",
      "directions_unconfigured",
    );
  }

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode: "driving",
    key: config.GOOGLE_DIRECTIONS_API_KEY,
  });
  if (opts.alternatives) params.set("alternatives", "true");
  if (opts.waypoints?.length) {
    params.set(
      "waypoints",
      opts.waypoints.map((w) => `${w.lat},${w.lng}`).join("|"),
    );
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
  );
  if (!res.ok) {
    throw new DirectionsError(`Directions API HTTP ${res.status}`);
  }
  const data = (await res.json()) as GDirectionsResponse;
  if (data.status !== "OK") {
    throw new DirectionsError(
      `Directions API status ${data.status}: ${data.error_message ?? ""}`.trim(),
      data.status,
    );
  }

  return data.routes.map((r) => ({
    polyline: r.overview_polyline.points,
    coordinates: decodePolyline(r.overview_polyline.points),
    summary: r.summary ?? "",
    distanceMeters: sumLegs(r.legs, "distance"),
    durationSeconds: sumLegs(r.legs, "duration"),
  }));
}
