/** [lng, lat] pair (GeoJSON coordinate order). */
export type Coord = [number, number];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LineStringGeoJSON {
  type: "LineString";
  coordinates: Coord[];
}

/**
 * Decode a Google "encoded polyline" string into [lng, lat] coordinates.
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): Coord[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Coord[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  return coordinates;
}

export function toLineString(coordinates: Coord[]): LineStringGeoJSON {
  return { type: "LineString", coordinates };
}

/**
 * A perpendicular offset waypoint from the midpoint of a route, used to force a
 * detour around a conflicting protest when no clean alternative exists.
 * Meters-to-degrees is a local approximation (fine at city scale).
 */
export function offsetWaypoint(coords: Coord[], offsetMeters = 400): LatLng {
  const first = coords[0];
  const last = coords[coords.length - 1];
  const mid = coords[Math.floor(coords.length / 2)] ?? first;
  if (!first || !last || !mid) {
    throw new Error("offsetWaypoint requires a non-empty coordinate list");
  }

  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector.
  const px = -dy / len;
  const py = dx / len;

  const latRad = (mid[1] * Math.PI) / 180;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.max(Math.cos(latRad), 1e-6);

  return {
    lat: mid[1] + (offsetMeters * py) / metersPerDegLat,
    lng: mid[0] + (offsetMeters * px) / metersPerDegLng,
  };
}
