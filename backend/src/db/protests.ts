import { query } from "./pool.js";
import type { OrgLinkRow, Row } from "../lib/serialize.js";

const PROTEST_COLUMNS = `
  p.id, p.title_en, p.title_es, p.cause_en, p.cause_es, p.goal_en, p.goal_es,
  p.description_en, p.description_es, p.event_date, p.start_time,
  p.estimated_duration_minutes, p.external_links, p.status, p.created_by,
  p.created_at, ST_AsGeoJSON(p.route) as route_geojson
`;

export async function listActiveProtests(): Promise<Row[]> {
  const res = await query(`
    select ${PROTEST_COLUMNS}
    from protests p
    where p.status = 'approved' and p.event_date >= current_date
    order by p.event_date, p.start_time nulls last
  `);
  return res.rows;
}

export async function getProtestRow(id: string): Promise<Row | null> {
  const res = await query(
    `select ${PROTEST_COLUMNS} from protests p where p.id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function getOrgLinksFor(protestId: string): Promise<OrgLinkRow[]> {
  const res = await query<OrgLinkRow>(
    `
    select o.id, o.name, o.website, o.social_links, po.role as link_role
    from protest_organizations po
    join organizations o on o.id = po.organization_id
    where po.protest_id = $1
    order by po.role, o.name
  `,
    [protestId],
  );
  return res.rows;
}

/**
 * Approved, upcoming protests whose route comes within `bufferMeters` of the
 * given route (GeoJSON LineString string). Uses geography casts so the buffer
 * is in meters.
 */
export async function findConflicts(
  routeGeoJSON: string,
  bufferMeters: number,
): Promise<Row[]> {
  const res = await query(
    `
    select ${PROTEST_COLUMNS}
    from protests p
    where p.status = 'approved'
      and p.event_date >= current_date
      and ST_DWithin(
        p.route::geography,
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography,
        $2
      )
    order by p.event_date
  `,
    [routeGeoJSON, bufferMeters],
  );
  return res.rows;
}

/**
 * A single GeoJSON polygon (union of buffered protest routes) to hand to the
 * router's avoid-area option, so it plans a route that dodges the protest(s).
 */
export async function getAvoidPolygon(
  protestIds: string[],
  bufferMeters: number,
): Promise<Record<string, unknown> | null> {
  if (protestIds.length === 0) return null;
  const res = await query<{ poly: string | null }>(
    `
    select ST_AsGeoJSON(
             ST_Union(ST_Buffer(route::geography, $2)::geometry)
           ) as poly
    from protests
    where id = any($1)
  `,
    [protestIds, bufferMeters],
  );
  const poly = res.rows[0]?.poly;
  return poly ? (JSON.parse(poly) as Record<string, unknown>) : null;
}
