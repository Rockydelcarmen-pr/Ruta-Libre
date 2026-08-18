import { config } from "../config.js";

export interface OsmParking {
  osm_id: string;
  name: string | null;
  lat: number;
  lng: number;
  kind: string;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: OsmParking[] }>();

/**
 * Fetch legal `amenity=parking` features near a point from OpenStreetMap via
 * Overpass. Best-effort: cached for 5 min, returns [] (or stale cache) on any
 * failure so it never breaks the endpoint.
 */
export async function fetchOsmParking(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<OsmParking[]> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(radiusMeters)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const q =
    `[out:json][timeout:15];(` +
    `node["amenity"="parking"](around:${radiusMeters},${lat},${lng});` +
    `way["amenity"="parking"](around:${radiusMeters},${lat},${lng});` +
    `);out center 60;`;

  try {
    const res = await fetch(config.OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: q,
    });
    if (!res.ok) return hit?.data ?? [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    const parsed: OsmParking[] = [];
    for (const el of data.elements ?? []) {
      const center =
        el.type === "way"
          ? el.center
          : el.lat !== undefined && el.lon !== undefined
            ? { lat: el.lat, lon: el.lon }
            : undefined;
      if (!center) continue;
      parsed.push({
        osm_id: `${el.type}/${el.id}`,
        name: el.tags?.name ?? null,
        lat: center.lat,
        lng: center.lon,
        kind: el.tags?.parking ?? "lot",
      });
    }
    cache.set(key, { at: Date.now(), data: parsed });
    return parsed;
  } catch {
    return hit?.data ?? [];
  }
}
