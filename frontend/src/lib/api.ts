import type { Lang, LatLng, MatchResponse, Protest } from "./types";

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
