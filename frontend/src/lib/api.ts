import type {
  AuthResult,
  Chip,
  Lang,
  LatLng,
  MatchResponse,
  ParkingSpot,
  Protest,
} from "./types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = (data && (data.error as string)) || undefined;
    const message = (data && (data.message as string)) || res.statusText;
    throw new ApiError(message, res.status, code);
  }
  return data as T;
}

export const apiBase = BASE;

export function getProtests(lang: Lang): Promise<Protest[]> {
  return request<Protest[]>(`/api/protests?lang=${lang}`);
}

export function getProtest(id: string, lang: Lang): Promise<Protest> {
  return request<Protest>(`/api/protests/${id}?lang=${lang}`);
}

/** Organizer/admin: every protest, any status or date. Requires a bearer token. */
export function getManagedProtests(
  token: string,
  lang: Lang,
): Promise<Protest[]> {
  return request<Protest[]>(`/api/protests/manage?lang=${lang}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function matchRoute(body: {
  origin: LatLng;
  destination: LatLng;
  lang: Lang;
}): Promise<MatchResponse> {
  return request<MatchResponse>("/api/protests/match", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deviceHeaders(deviceToken: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-device-token": deviceToken,
  };
}

// --- Auth (organizers only) ---

export function login(body: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  return request<AuthResult>("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function bearerHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

// --- Organizations ---

export interface OrgSummary {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  protest_count: number;
}

export interface OrgDetail {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  social_links: unknown;
  protests: Protest[];
}

export function getOrganizations(): Promise<OrgSummary[]> {
  return request<OrgSummary[]>("/api/organizations");
}

export function getOrganization(id: string, lang: Lang): Promise<OrgDetail> {
  return request<OrgDetail>(`/api/organizations/${id}?lang=${lang}`);
}

export function createOrganization(
  token: string,
  body: { name: string; description?: string; website?: string },
): Promise<OrgSummary> {
  return request<OrgSummary>("/api/organizations", {
    method: "POST",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });
}

// --- Organizer: create a protest ---

export interface CreateProtestBody {
  title_en?: string;
  title_es?: string;
  cause_en?: string;
  cause_es?: string;
  goal_en?: string;
  goal_es?: string;
  event_date: string;
  start_time?: string;
  estimated_duration_minutes?: number;
  route: { type: "LineString"; coordinates: [number, number][] };
  tags?: string[];
  external_links?: string[];
  organizations?: { organization_id: string; role: "organizer" | "participant" }[];
  status?: "pending" | "approved" | "cancelled";
}

export function createProtest(
  token: string,
  body: CreateProtestBody,
): Promise<Protest> {
  return request<Protest>("/api/protests", {
    method: "POST",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });
}

export interface ProtestEditData {
  title_en: string | null;
  title_es: string | null;
  cause_en: string | null;
  cause_es: string | null;
  event_date: string;
  start_time: string | null;
  estimated_duration_minutes: number | null;
  tags: string[];
  coordinates: [number, number][];
  organization_ids: string[];
}

export function getProtestForEdit(
  token: string,
  id: string,
): Promise<ProtestEditData> {
  return request<ProtestEditData>(`/api/protests/${id}/edit`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function updateProtest(
  token: string,
  id: string,
  body: Partial<CreateProtestBody>,
): Promise<Protest> {
  return request<Protest>(`/api/protests/${id}`, {
    method: "PATCH",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });
}

export function deleteProtest(
  token: string,
  id: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/protests/${id}`, {
    method: "DELETE",
    headers: bearerHeaders(token),
  });
}

export function updateOrganization(
  token: string,
  id: string,
  body: { name?: string; description?: string | null; website?: string | null },
): Promise<{
  id: string;
  name: string;
  description: string | null;
  website: string | null;
}> {
  return request(`/api/organizations/${id}`, {
    method: "PATCH",
    headers: bearerHeaders(token),
    body: JSON.stringify(body),
  });
}

export function deleteOrganization(
  token: string,
  id: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/organizations/${id}`, {
    method: "DELETE",
    headers: bearerHeaders(token),
  });
}

// --- Anonymous device identity (for community parking chips) ---

/**
 * Mint an anonymous device token. Call once on first use and persist the result
 * on-device; it carries no personal data and needs no email/password.
 */
export function createDevice(): Promise<{ device_token: string }> {
  return request<{ device_token: string }>("/api/devices", { method: "POST" });
}

// --- Legal parking ---

export function getParking(
  lat: number,
  lng: number,
  radius?: number,
): Promise<{ spots: ParkingSpot[] }> {
  const r = radius ? `&radius=${radius}` : "";
  return request<{ spots: ParkingSpot[] }>(
    `/api/parking?lat=${lat}&lng=${lng}${r}`,
  );
}

// --- Community parking chips ---

export function getChips(
  lat: number,
  lng: number,
  radius?: number,
): Promise<{ chips: Chip[] }> {
  const r = radius ? `&radius=${radius}` : "";
  return request<{ chips: Chip[] }>(`/api/chips?lat=${lat}&lng=${lng}${r}`);
}

export function dropChip(
  deviceToken: string,
  body: { lat: number; lng: number; note?: string },
): Promise<Chip> {
  return request<Chip>("/api/chips", {
    method: "POST",
    headers: deviceHeaders(deviceToken),
    body: JSON.stringify(body),
  });
}

export function takeChip(
  deviceToken: string,
  id: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/chips/${id}/taken`, {
    method: "POST",
    headers: deviceHeaders(deviceToken),
  });
}

export function deleteChip(
  deviceToken: string,
  id: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/chips/${id}`, {
    method: "DELETE",
    headers: deviceHeaders(deviceToken),
  });
}
