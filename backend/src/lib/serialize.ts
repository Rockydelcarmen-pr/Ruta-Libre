import type { Lang } from "./i18n.js";

export type Row = Record<string, unknown>;

function pick(row: Row, field: string, lang: Lang): string | null {
  const other: Lang = lang === "en" ? "es" : "en";
  return (
    (row[`${field}_${lang}`] as string | null) ??
    (row[`${field}_${other}`] as string | null) ??
    null
  );
}

export interface SerializedOrg {
  id: string;
  name: string;
  role: string;
  website: string | null;
  social_links: unknown;
}

export interface SerializedProtest {
  id: string;
  title: string | null;
  cause: string | null;
  goal: string | null;
  description: string | null;
  event_date: unknown;
  start_time: unknown;
  estimated_duration_minutes: number | null;
  external_links: unknown;
  tags: string[];
  streets: string[];
  status: string;
  route_geojson: unknown;
  organizers: SerializedOrg[];
  participants: SerializedOrg[];
  organizer_names: string[];
}

/** An org row joined with its protest_organizations.role (aliased link_role). */
export interface OrgLinkRow extends Row {
  id: string;
  name: string;
  website: string | null;
  social_links: unknown;
  link_role: string;
}

function toOrg(o: OrgLinkRow): SerializedOrg {
  return {
    id: o.id,
    name: o.name,
    role: o.link_role,
    website: o.website,
    social_links: o.social_links,
  };
}

export function serializeProtest(
  row: Row,
  lang: Lang,
  orgLinks: OrgLinkRow[] = [],
): SerializedProtest {
  return {
    id: row.id as string,
    title: pick(row, "title", lang),
    cause: pick(row, "cause", lang),
    goal: pick(row, "goal", lang),
    description: pick(row, "description", lang),
    event_date: row.event_date,
    start_time: row.start_time,
    estimated_duration_minutes:
      (row.estimated_duration_minutes as number | null) ?? null,
    external_links: row.external_links ?? [],
    tags: (row.tags as string[] | null) ?? [],
    streets: (row.streets as string[] | null) ?? [],
    status: row.status as string,
    route_geojson:
      typeof row.route_geojson === "string"
        ? JSON.parse(row.route_geojson)
        : (row.route_geojson ?? null),
    organizers: orgLinks.filter((o) => o.link_role === "organizer").map(toOrg),
    participants: orgLinks
      .filter((o) => o.link_role === "participant")
      .map(toOrg),
    organizer_names: (row.organizer_names as string[] | null) ?? [],
  };
}
