import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "migrations");

async function run(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists _migrations (
        id serial primary key,
        name text unique not null,
        applied_at timestamptz not null default now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const appliedRes = await client.query<{ name: string }>(
      "select name from _migrations",
    );
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip   ${file}`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`apply  ${file}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into _migrations(name) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }
    console.log("migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
