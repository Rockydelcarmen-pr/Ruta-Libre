import pg from "pg";
import { config } from "../config.js";

// Remote managed Postgres (e.g. Supabase) requires SSL; local dev does not.
const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)/.test(
  config.DATABASE_URL,
);

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as unknown[] | undefined);
}
