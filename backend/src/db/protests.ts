import { query } from "./pool.js";
import type { OrgLinkRow, Row } from "../lib/serialize.js";

const PROTEST_COLUMNS = `
  p.id, p.title_en, p.title_es, p.cause_en, p.cause_es, p.goal_en, p.goal_es,
  p.description_en, p.description_es,
  to_char(p.event_date, 'YYYY-MM-DD') as event_date,
  to_char(p.start_time, 'HH24:MI') as start_time,
  p.estimated_duration_minutes, p.external_links, p.tags, p.streets, p.status,
  p.created_by, p.created_at, ST_AsGeoJSON(p.route) as route_geojson
`;

export async function listActiveProtests(): Promise<Row[]> {
  const res = await query(`
    select ${PROTEST_COLUMNS},
      coalesce(
        array_agg(o.name) filter (where o.id is not null and po.role = 'organizer'),
        '{}'
      ) as organizer_names
    from protests p
    left join protest_organizations po on po.protest_id = p.id
    left join organizations o on o.id = po.organization_id
    where p.status = 'approved' and p.event_date >= current_date
    group by p.id
    order by p.event_date, p.start_time nulls last
  `);
  return res.rows;
}

/** Every protest, any status and any date. For the organizer/admin management view. */
export async function listAllProtests(): Promise<Row[]> {
  const res = await query(`
    select ${PROTEST_COLUMNS},
      coalesce(
        array_agg(o.name) filter (where o.id is not null and po.role = 'organizer'),
        '{}'
      ) as organizer_names
    from protests p
    left join protest_organizations po on po.protest_id = p.id
    left join organizations o on o.id = po.organization_id
    group by p.id
    order by p.event_date desc, p.start_time nulls last
  `);
  return res.rows;
}

/** Every protest created by a given user, any status/date. For an organizer's own view. */
export async function listProtestsByCreator(userId: string): Promise<Row[]> {
  const res = await query(
    `
    select ${PROTEST_COLUMNS},
      coalesce(
        array_agg(o.name) filter (where o.id is not null and po.role = 'organizer'),
        '{}'
      ) as organizer_names
    from protests p
    left join protest_organizations po on po.protest_id = p.id
    left join organizations o on o.id = po.organization_id
    where p.created_by = $1
    group by p.id
    order by p.event_date desc, p.start_time nulls last
  `,
    [userId],
  );
  return res.rows;
}

/** Approved, upcoming protests linked to a given organization (any role). */
export async function protestsForOrg(orgId: string): Promise<Row[]> {
  const res = await query(
    `
    select ${PROTEST_COLUMNS},
      coalesce(
        array_agg(o.name) filter (where o.id is not null and po2.role = 'organizer'),
        '{}'
      ) as organizer_names
    from protests p
    join protest_organizations link
      on link.protest_id = p.id and link.organization_id = $1
    left join protest_organizations po2 on po2.protest_id = p.id
    left join organizations o on o.id = po2.organization_id
    where p.status = 'approved' and p.event_date >= current_date
    group by p.id
    order by p.event_date, p.start_time nulls last
  `,
    [orgId],
  );
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
