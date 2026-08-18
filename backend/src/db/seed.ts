import { pool, query } from "./pool.js";
import { hashPassword } from "../lib/password.js";
import { generateAccessKey, hashAccessKey } from "../lib/accessKey.js";
import type { LineStringGeoJSON } from "../lib/geo.js";

const ADMIN_EMAIL = "admin@protest-tracker.local";

async function upsertOrg(
  name: string,
  description: string,
  website: string,
): Promise<string> {
  const existing = await query<{ id: string }>(
    "select id from organizations where name = $1",
    [name],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const res = await query<{ id: string }>(
    `insert into organizations (name, description, website)
     values ($1, $2, $3) returning id`,
    [name, description, website],
  );
  return res.rows[0]!.id;
}

async function insertProtest(p: {
  title_en: string;
  title_es: string;
  cause_en: string;
  cause_es: string;
  goal_en: string;
  goal_es: string;
  event_date: string;
  start_time: string;
  duration: number;
  route: LineStringGeoJSON;
  createdBy: string;
  orgId: string;
}): Promise<string> {
  const res = await query<{ id: string }>(
    `insert into protests
      (title_en, title_es, cause_en, cause_es, goal_en, goal_es,
       event_date, start_time, estimated_duration_minutes, route, status, created_by)
     values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9, ST_SetSRID(ST_GeomFromGeoJSON($10), 4326), 'approved', $11)
     returning id`,
    [
      p.title_en,
      p.title_es,
      p.cause_en,
      p.cause_es,
      p.goal_en,
      p.goal_es,
      p.event_date,
      p.start_time,
      p.duration,
      JSON.stringify(p.route),
      p.createdBy,
    ],
  );
  const id = res.rows[0]!.id;
  await query(
    `insert into protest_organizations (protest_id, organization_id, role)
     values ($1, $2, 'organizer') on conflict do nothing`,
    [id, p.orgId],
  );
  return id;
}

async function seed(): Promise<void> {
  // Admin user (idempotent).
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";
  const adminHash = await hashPassword(adminPassword);
  await query(
    `insert into users (email, password_hash, role, preferred_language)
     values ($1, $2, 'admin', 'en')
     on conflict (email) do nothing`,
    [ADMIN_EMAIL, adminHash],
  );
  const adminRes = await query<{ id: string }>(
    "select id from users where email = $1",
    [ADMIN_EMAIL],
  );
  const adminId = adminRes.rows[0]!.id;

  // Ensure one unused access key exists; create + print if not.
  const unused = await query<{ id: string }>(
    "select id from access_keys where used_by is null limit 1",
  );
  let accessKeyMessage: string;
  if (unused.rows[0]) {
    accessKeyMessage = "An unused access key already exists (not reprinted).";
  } else {
    const key = generateAccessKey();
    await query(
      `insert into access_keys (key_hash, role_grant, created_by)
       values ($1, 'approved', $2)`,
      [hashAccessKey(key), adminId],
    );
    accessKeyMessage = `New access key (use once to register an approved user): ${key}`;
  }

  // Sample orgs + protests only when there are none yet.
  const protestCount = await query<{ count: string }>(
    "select count(*)::text as count from protests",
  );
  if ((protestCount.rows[0]?.count ?? "0") === "0") {
    const escambron = await upsertOrg(
      "Escambrón Unido",
      "Community coalition defending public access to El Escambrón.",
      "https://example.org/escambron-unido",
    );
    const sierra = await upsertOrg(
      "Sierra Club Puerto Rico",
      "Environmental advocacy organization.",
      "https://www.sierraclub.org/puerto-rico",
    );

    await insertProtest({
      title_en: "March for El Escambrón",
      title_es: "Marcha por El Escambrón",
      cause_en: "Opposing the privatization of coastal public land.",
      cause_es: "Oposición a la privatización de terreno costero público.",
      goal_en: "Stop Ordinance 55 and keep beach access public.",
      goal_es: "Detener la Ordenanza 55 y mantener el acceso público a la playa.",
      event_date: "2026-08-22",
      start_time: "10:00",
      duration: 180,
      route: {
        type: "LineString",
        coordinates: [
          [-66.0975, 18.4665],
          [-66.096, 18.4658],
          [-66.0945, 18.465],
        ],
      },
      createdBy: adminId,
      orgId: escambron,
    });

    await insertProtest({
      title_en: "Old San Juan Climate Walk",
      title_es: "Caminata Climática del Viejo San Juan",
      cause_en: "Coastal resilience and climate action.",
      cause_es: "Resiliencia costera y acción climática.",
      goal_en: "Raise awareness of sea-level rise in the historic district.",
      goal_es: "Concientizar sobre el aumento del nivel del mar en el casco histórico.",
      event_date: "2026-08-29",
      start_time: "09:00",
      duration: 120,
      route: {
        type: "LineString",
        coordinates: [
          [-66.118, 18.4655],
          [-66.115, 18.4665],
          [-66.112, 18.467],
        ],
      },
      createdBy: adminId,
      orgId: sierra,
    });
  }

  console.log("Seed complete.");
  console.log(`  Admin: ${ADMIN_EMAIL} / ${adminPassword}`);
  console.log(`  ${accessKeyMessage}`);
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
