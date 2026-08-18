export type Lang = "en" | "es";

export interface Organization {
  id: string;
  name: string;
  role: string;
  website: string | null;
  social_links: unknown;
}

export interface LineString {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface Protest {
  id: string;
  title: string | null;
  cause: string | null;
  goal: string | null;
  description: string | null;
  event_date: string;
  start_time: string | null;
  estimated_duration_minutes: number | null;
  external_links: string[];
  status: string;
  route_geojson: LineString | null;
  organizers: Organization[];
  participants: Organization[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteJson {
  polyline: string;
  geojson: LineString;
  summary: string;
  distance_meters: number;
  duration_seconds: number;
}

export interface CalendarLinks {
  google: string;
  ics_download_url: string;
}

export interface MatchResponse {
  conflict: boolean;
  protest: Protest | null;
  protests: Protest[];
  requested_route?: RouteJson;
  suggested_route: RouteJson | null;
  suggested_route_has_conflict?: boolean;
  calendar_links: CalendarLinks | null;
}
