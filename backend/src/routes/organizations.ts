import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db/pool.js";
import { protestsForOrg } from "../db/protests.js";
import { serializeProtest } from "../lib/serialize.js";
import { normalizeLang } from "../lib/i18n.js";

const createOrgSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional(),
  // Ad-hoc orgs named on a protest default to unlisted (this protest only).
  // Only an explicit listed:true (e.g. an admin adding an official org) lists it.
  listed: z.boolean().optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  website: z.union([z.string().url(), z.literal("")]).nullable().optional(),
});

interface OrgSummaryRow {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  protest_count: string;
}

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  // Public: directory of organizations with a count of their upcoming protests.
  app.get("/api/organizations", async (_req, reply) => {
    const res = await query<OrgSummaryRow>(
      `
      select o.id, o.name, o.description, o.website,
        count(distinct p.id) filter (
          where p.status = 'approved' and p.event_date >= current_date
        ) as protest_count
      from organizations o
      left join protest_organizations po on po.organization_id = o.id
      left join protests p on p.id = po.protest_id
      where o.listed = true
      group by o.id
      order by o.name
    `,
    );
    return reply.send(
      res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        website: r.website,
        protest_count: Number(r.protest_count),
      })),
    );
  });

  // Public: one organization plus its upcoming protests.
  app.get("/api/organizations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const lang = normalizeLang((req.query as { lang?: string }).lang);
    const orgRes = await query<{
      id: string;
      name: string;
      description: string | null;
      website: string | null;
      social_links: unknown;
    }>(
      "select id, name, description, website, social_links from organizations where id = $1",
      [id],
    );
    const org = orgRes.rows[0];
    if (!org) return reply.code(404).send({ error: "not_found" });
    const rows = await protestsForOrg(id);
    return reply.send({
      ...org,
      protests: rows.map((r) => serializeProtest(r, lang)),
    });
  });

  // Approved/admin: create an organization.
  app.post(
    "/api/organizations",
    { preHandler: app.requireRole(["approved", "admin"]) },
    async (req, reply) => {
      const parsed = createOrgSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const { name, description, website, listed } = parsed.data;
      const res = await query<{
        id: string;
        name: string;
        description: string | null;
        website: string | null;
      }>(
        `insert into organizations (name, description, website, listed)
         values ($1, $2, $3, $4) returning id, name, description, website`,
        [name, description ?? null, website ?? null, listed ?? false],
      );
      return reply.code(201).send({ ...res.rows[0], protest_count: 0 });
    },
  );

  // Admin: edit an organization (fix a typo, add a website, etc.).
  app.patch(
    "/api/organizations/:id",
    { preHandler: app.requireRole(["admin"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = updateOrgSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const data = parsed.data as Record<string, unknown>;
      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const field of ["name", "description", "website"] as const) {
        if (data[field] !== undefined) {
          sets.push(`${field} = $${i++}`);
          vals.push(data[field] === "" ? null : data[field]);
        }
      }
      if (sets.length === 0) {
        return reply.code(400).send({ error: "no_fields" });
      }
      vals.push(id);
      const res = await query<{
        id: string;
        name: string;
        description: string | null;
        website: string | null;
      }>(
        `update organizations set ${sets.join(", ")} where id = $${i}
         returning id, name, description, website`,
        vals,
      );
      if (!res.rows[0]) return reply.code(404).send({ error: "not_found" });
      return reply.send(res.rows[0]);
    },
  );

  // Admin: delete an organization (cascades its protest links).
  app.delete(
    "/api/organizations/:id",
    { preHandler: app.requireRole(["admin"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const res = await query("delete from organizations where id = $1", [id]);
      if (!res.rowCount) return reply.code(404).send({ error: "not_found" });
      return reply.send({ ok: true });
    },
  );
}
