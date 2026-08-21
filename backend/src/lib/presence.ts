import geoip from "geoip-lite";

/**
 * Coarse, stateless "are you actually near here?" check for chip drops.
 *
 * A browser's reported GPS cannot be cryptographically verified, so we can't
 * *prove* presence. What we can do cheaply is cross-check the request's IP
 * against the claimed coordinates using a LOCAL geo-IP database (no third-party
 * calls, so we never leak user IPs, and nothing is stored). This catches lazy
 * spoofing — someone in another country POSTing coordinates across the world —
 * while a VPN/proxy near the target still defeats it. Real presence proof needs
 * native attestation (App Attest / Play Integrity), which a PWA cannot provide.
 *
 * Deliberately generous and fail-open: IP geolocation is imprecise (carrier NAT
 * can misplace a mobile user by tens of km or into another region), so a legit
 * user must never be blocked by a bad IP lookup. We only reject a gross,
 * continent-scale mismatch; when the IP has no usable geo data (localhost,
 * private ranges, unknown IPs), we allow the drop.
 */

const EARTH_RADIUS_KM = 6371;

function haversineKm(
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
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface PresenceResult {
  ok: boolean;
  /** Distance in km between the IP's coarse location and the claimed point, if known. */
  distanceKm: number | null;
  /** Why it was allowed/denied, for logging (never a hard promise of presence). */
  reason: "no_ip_geo" | "within_range" | "too_far";
}

/**
 * @param ip       request client IP (must be the real client IP — set trustProxy)
 * @param lat/lng  the coordinates the chip is being dropped at
 * @param maxKm    maximum tolerated distance between IP location and claim
 */
export function checkIpProximity(
  ip: string,
  lat: number,
  lng: number,
  maxKm: number,
): PresenceResult {
  const geo = geoip.lookup(ip);
  if (!geo || !geo.ll || geo.ll.length < 2) {
    // No usable geo data (localhost, private range, unknown IP): fail open.
    return { ok: true, distanceKm: null, reason: "no_ip_geo" };
  }
  const [ipLat, ipLng] = geo.ll;
  const distanceKm = haversineKm(ipLat, ipLng, lat, lng);
  return distanceKm <= maxKm
    ? { ok: true, distanceKm, reason: "within_range" }
    : { ok: false, distanceKm, reason: "too_far" };
}
