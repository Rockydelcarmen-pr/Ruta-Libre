import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool, query } from "../db/pool.js";
import {
  getOrgLinksFor,
  getProtestRow,
  listActiveProtests,
  listAllProtests,
  listProtestsByCreator,
} from "../db/protests.js";
import { serializeProtest } from "../lib/serialize.js";
import { normalizeLang } from "../lib/i18n.js";
import { buildIcs } from "../lib/calendar.js";

const coord = z.tuple([z.number(), z.number()]);
const lineString = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(coord).min(2),
});
const orgLink = z.object({
  organization_id: z.string().uuid(),
  role: z.enum(["organizer", "participant"]).default("organizer"),
});

const baseObject = z.object({
  title_en: z.string().min(1).optional(),
  title_es: z.string().min(1).optional(),
  cause_en: z.string().optional(),
  cause_es: z.string().optional(),
  goal_en: z.string().optional(),
  goal_es: z.string().optional(),
  description_en: z.string().optional(),
  description_es: z.string().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  estimated_duration_minutes: z.number().int().positive().optional(),
  route: lineString,
  external_links: z.array(z.string().url()).optional(),
  tags: z.array(z.string().min(1)).max(20).optional(),
  organizations: z.array(orgLink).optional(),
  status: z.enum(["pending", "approved", "cancelled"]).optional(),
});

const createSchema = baseObject.refine((d) => d.title_en || d.title_es, {
  message: "title_en or title_es is required",
  path: ["title_en"],
});
const patchSchema = baseObject.partial();

const SCALAR_FIELDS = [
  "title_en",
  "title_es",
  "cause_en",
  "cause_es",
  "goal_en",
  "goal_es",
  "description_en",
  "description_es",
  "event_date",
  "start_time",
  "estimated_duration_minutes",
  "status",
] as const;

async function replaceOrgLinks(
  client: {
    query: (text: string, params?: unknown[]) => Promise<unknown>;
  },
  protestId: string,
  orgs: Array<{ organization_id: string; role: "organizer" | "participant" }>,
): Promise<void> {
  await client.query(
    "delete from protest_organizations where protest_id = $1",
    [protestId],
  );
  for (const o of orgs) {
    await client.query(
      `insert into protest_organizations (protest_id, organization_id, role)
       values ($1, $2, $3)
       on conflict do nothing`,
      [protestId, o.organization_id, o.role],
    );
  }
}

export async function protestRoutes(app: FastifyInstance): Promise<void> {
  const writeGuard = app.requireRole(["approved", "admin"]);

  // Public: list active/upcoming protests.
  app.get("/api/protests", async (req, reply) => {
    const lang = normalizeLang((req.query as { lang?: string }).lang);
    const rows = await listActiveProtests();
    return reply.send(rows.map((r) => serializeProtest(r, lang)));
  });

  // Management list. Admins see every protest; organizers see only the ones
  // they created. Any status or date (unlike the public feed).
  app.get("/api/protests/manage", { preHandler: writeGuard }, async (req, reply) => {
    const lang = normalizeLang((req.query as { lang?: string }).lang);
    const rows =
      req.user.role === "admin"
        ? await listAllProtests()
        : await listProtestsByCreator(req.user.sub);
    return reply.send(rows.map((r) => serializeProtest(r, lang)));
  });

  // Approved/admin: raw editable fields (both languages, route coords, org ids).
  // Organizers may only edit their own; admins may edit any.
  app.get(
    "/api/protests/:id/edit",
    { preHandler: writeGuard },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const res = await query<Record<string, unknown>>(
        `select title_en, title_es, cause_en, cause_es, goal_en, goal_es,
           to_char(event_date, 'YYYY-MM-DD') as event_date,
           to_char(start_time, 'HH24:MI') as start_time,
           estimated_duration_minutes, tags, status, created_by,
           ST_AsGeoJSON(route) as route_geojson
         from protests where id = $1`,
        [id],
      );
      const row = res.rows[0];
      if (!row) return reply.code(404).send({ error: "not_found" });
      if (req.user.role !== "admin" && row.created_by !== req.user.sub) {
        return reply.code(403).send({ error: "forbidden" });
      }
      const links = await query<{ organization_id: string }>(
        "select organization_id from protest_organizations where protest_id = $1 and role = 'organizer'",
        [id],
      );
      const route = JSON.parse(row.route_geojson as string) as {
        coordinates: [number, number][];
      };
      return reply.send({
        title_en: row.title_en,
        title_es: row.title_es,
        cause_en: row.cause_en,
        cause_es: row.cause_es,
        event_date: row.event_date,
        start_time: row.start_time,
        estimated_duration_minutes: row.estimated_duration_minutes,
        tags: row.tags,
        coordinates: route.coordinates,
        organization_ids: links.rows.map((r) => r.organization_id),
      });
    },
  );

  // Public: full detail incl. organizers/participants.
  app.get("/api/protests/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const lang = normalizeLang((req.query as { lang?: string }).lang);
    const row = await getProtestRow(id);
    if (!row) return reply.code(404).send({ error: "not_found" });
    const orgs = await getOrgLinksFor(id);
    return reply.send(serializeProtest(row, lang, orgs));
  });

  // Public: downloadable .ics for a protest.
  app.get("/api/protests/:id/calendar.ics", async (req, reply) => {
    const { id } = req.params as { id: string };
    const lang = normalizeLang((req.query as { lang?: string }).lang);
    const row = await getProtestRow(id);
    if (!row) return reply.code(404).send({ error: "not_found" });
    const s = serializeProtest(row, lang);
    const ics = buildIcs({
      title: s.title ?? "Protest",
      description: s.cause ?? s.description,
      externalLinks: Array.isArray(s.external_links)
        ? (s.external_links as string[])
        : [],
      eventDate: String(s.event_date),
      startTime: s.start_time ? String(s.start_time) : null,
      durationMinutes: s.estimated_duration_minutes,
    });
    return reply
      .header("content-type", "text/calendar; charset=utf-8")
      .header(
        "content-disposition",
        `attachment; filename="protest-${id}.ics"`,
      )
      .send(ics);
  });

  // Approved/admin: create a protest.
  app.post("/api/protests", { preHandler: writeGuard }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const d = parsed.data;
    const client = await pool.connect();
    try {
      await client.query("begin");
      const inserted = await client.query<{ id: string }>(
        `insert into protests
          (title_en, title_es, cause_en, cause_es, goal_en, goal_es,
           description_en, description_es, event_date, start_time,
           estimated_duration_minutes, route, external_links, tags, status, created_by)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
           ST_SetSRID(ST_GeomFromGeoJSON($12), 4326), $13::jsonb, $14, $15, $16)
         returning id`,
        [
          d.title_en ?? null,
          d.title_es ?? null,
          d.cause_en ?? null,
          d.cause_es ?? null,
          d.goal_en ?? null,
          d.goal_es ?? null,
          d.description_en ?? null,
          d.description_es ?? null,
          d.event_date,
          d.start_time ?? null,
          d.estimated_duration_minutes ?? null,
          JSON.stringify(d.route),
          JSON.stringify(d.external_links ?? []),
          d.tags ?? [],
          d.status ?? "pending",
          req.user.sub,
        ],
      );
      const id = inserted.rows[0]!.id;
      if (d.organizations?.length) {
        await replaceOrgLinks(client, id, d.organizations);
      }
      await client.query("commit");
      const row = await getProtestRow(id);
      const orgs = await getOrgLinksFor(id);
      const lang = normalizeLang((req.query as { lang?: string }).lang);
      return reply.code(201).send(serializeProtest(row!, lang, orgs));
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  // Approved/admin: update a protest.
  app.patch(
    "/api/protests/:id",
    { preHandler: writeGuard },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const data = parsed.data as Record<string, unknown>;

      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const field of SCALAR_FIELDS) {
        if (data[field] !== undefined) {
          sets.push(`${field} = $${i++}`);
          vals.push(data[field]);
        }
      }
      if (data.external_links !== undefined) {
        sets.push(`external_links = $${i++}::jsonb`);
        vals.push(JSON.stringify(data.external_links));
      }
      if (data.tags !== undefined) {
        sets.push(`tags = $${i++}`);
        vals.push(data.tags);
      }
      if (data.route !== undefined) {
        sets.push(`route = ST_SetSRID(ST_GeomFromGeoJSON($${i++}), 4326)`);
        vals.push(JSON.stringify(data.route));
      }

      const client = await pool.connect();
      try {
        await client.query("begin");
        const exists = await client.query<{ created_by: string | null }>(
          "select created_by from protests where id = $1",
          [id],
        );
        if (!exists.rows[0]) {
          await client.query("rollback");
          return reply.code(404).send({ error: "not_found" });
        }
        // Organizers may only edit their own protests; admins may edit any.
        if (
          req.user.role !== "admin" &&
          exists.rows[0].created_by !== req.user.sub
        ) {
          await client.query("rollback");
          return reply.code(403).send({ error: "forbidden" });
        }
        if (sets.length) {
          vals.push(id);
          await client.query(
            `update protests set ${sets.join(", ")} where id = $${i}`,
            vals,
          );
        }
        if (parsed.data.organizations !== undefined) {
          await replaceOrgLinks(client, id, parsed.data.organizations);
        }
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }

      const row = await getProtestRow(id);
      const orgs = await getOrgLinksFor(id);
      const lang = normalizeLang((req.query as { lang?: string }).lang);
      return reply.send(serializeProtest(row!, lang, orgs));
    },
  );

  // Delete a protest. Admins may delete any; organizers only their own.
  app.delete(
    "/api/protests/:id",
    { preHandler: writeGuard },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await query<{ created_by: string | null }>(
        "select created_by from protests where id = $1",
        [id],
      );
      if (!existing.rows[0]) return reply.code(404).send({ error: "not_found" });
      if (
        req.user.role !== "admin" &&
        existing.rows[0].created_by !== req.user.sub
      ) {
        return reply.code(403).send({ error: "forbidden" });
      }
      await query("delete from protests where id = $1", [id]);
      return reply.send({ ok: true });
    },
  );
}
