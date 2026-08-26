const EARTH_RADIUS_M = 6371000;

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Shortest distance from a point to any vertex of a route, in meters. Good
    enough for a "are you near this march" check without pulling in a full
    point-to-line-segment library for a route made of many close-together
    points. */
export function distanceToRouteMeters(
  lat: number,
  lng: number,
  route: [number, number][],
): number {
  let min = Infinity;
  for (const [routeLng, routeLat] of route) {
    const d = haversineMeters(lat, lng, routeLat, routeLng);
    if (d < min) min = d;
  }
  return min;
}
