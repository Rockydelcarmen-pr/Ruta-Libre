import { query } from "./pool.js";

export interface ParkingSpotRow {
  id: string;
  name: string | null;
  kind: string;
  lat: number;
  lng: number;
  capacity: number | null;
  notes_en: string | null;
  notes_es: string | null;
  source: string;
}

export interface ChipRow {
  id: string;
  lat: number;
  lng: number;
  note: string | null;
  status: string;
  reported_by: string | null;
  created_at: string;
  expires_at: string;
}

// ST_MakePoint takes (lng, lat); callers pass params as [lat, lng, ...].
const POINT = "ST_SetSRID(ST_MakePoint($2, $1), 4326)";

export async function nearbyParkingSpots(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<ParkingSpotRow[]> {
  const res = await query<ParkingSpotRow>(
    `
    select id, name, kind, capacity, notes_en, notes_es, source,
           ST_Y(location) as lat, ST_X(location) as lng
    from parking_spots
    where ST_DWithin(location::geography, ${POINT}::geography, $3)
    order by location <-> ${POINT}
    limit 100
  `,
    [lat, lng, radiusMeters],
  );
  return res.rows;
}

export async function insertParkingSpot(input: {
  name: string | null;
  kind: string;
  lat: number;
  lng: number;
  capacity: number | null;
  notes_en: string | null;
  notes_es: string | null;
  createdBy: string;
}): Promise<ParkingSpotRow> {
  const res = await query<ParkingSpotRow>(
    `
    insert into parking_spots
      (name, kind, location, capacity, notes_en, notes_es, source, created_by)
    values
      ($4, $5, ST_SetSRID(ST_MakePoint($2, $1), 4326), $6, $7, $8, 'admin', $9)
    returning id, name, kind, capacity, notes_en, notes_es, source,
              ST_Y(location) as lat, ST_X(location) as lng
  `,
    [
      input.lat,
      input.lng,
      input.name,
      input.kind,
      input.capacity,
      input.notes_en,
      input.notes_es,
      input.createdBy,
    ],
  );
  return res.rows[0]!;
}

export async function nearbyLiveChips(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<ChipRow[]> {
  const res = await query<ChipRow>(
    `
    select id, note, status, reported_by, created_at, expires_at,
           ST_Y(location) as lat, ST_X(location) as lng
    from parking_chips
    where status = 'available'
      and expires_at > now()
      and ST_DWithin(location::geography, ${POINT}::geography, $3)
    order by created_at desc
    limit 200
  `,
    [lat, lng, radiusMeters],
  );
  return res.rows;
}

export async function insertChip(input: {
  lat: number;
  lng: number;
  note: string | null;
  reportedBy: string;
  ttlMinutes: number;
}): Promise<ChipRow> {
  const res = await query<ChipRow>(
    `
    insert into parking_chips (location, note, reported_by, expires_at)
    values (ST_SetSRID(ST_MakePoint($2, $1), 4326), $3, $4,
            now() + make_interval(mins => $5))
    returning id, note, status, reported_by, created_at, expires_at,
              ST_Y(location) as lat, ST_X(location) as lng
  `,
    [input.lat, input.lng, input.note, input.reportedBy, input.ttlMinutes],
  );
  return res.rows[0]!;
}

/** Mark a live chip taken. Returns false if it does not exist or is already gone. */
export async function markChipTaken(
  id: string,
  userId: string,
): Promise<boolean> {
  const res = await query(
    `
    update parking_chips
    set status = 'taken', taken_by = $2, taken_at = now()
    where id = $1 and status = 'available'
  `,
    [id, userId],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Delete a chip if owned by the user (or if admin). Returns false if not allowed/found. */
export async function deleteChip(
  id: string,
  userId: string,
  isAdmin: boolean,
): Promise<boolean> {
  const res = isAdmin
    ? await query("delete from parking_chips where id = $1", [id])
    : await query(
        "delete from parking_chips where id = $1 and reported_by = $2",
        [id, userId],
      );
  return (res.rowCount ?? 0) > 0;
}
