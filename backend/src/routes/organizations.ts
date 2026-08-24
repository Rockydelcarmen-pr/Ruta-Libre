import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db/pool.js";
import { protestsForOrg } from "../db/protests.js";
import { serializeProtest } from "../lib/serialize.js";
import { normalizeLang } from "../lib/i18n.js";

const socialLinksSchema = z.record(
  z.enum(["instagram", "twitter", "facebook", "tiktok"]),
  z.union([z.string().url(), z.literal("")]),
);

const createOrgSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional(),
  social_links: socialLinksSchema.optional(),
  // Ad-hoc orgs named on a protest default to unlisted (this protest only).
  // Only an explicit listed:true (e.g. an admin adding an official org) lists it.
  listed: z.boolean().optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  website: z.union([z.string().url(), z.literal("")]).nullable().optional(),
  social_links: socialLinksSchema.optional(),
  // Admin-only: reassign which organizer account manages this org.
  owner_user_id: z.string().uuid().nullable().optional(),
});

interface OrgSummaryRow {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  social_links: unknown;
  protest_count: string;
}

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  // Public: directory of organizations with a count of their upcoming protests.
  app.get("/api/organizations", async (_req, reply) => {
    const res = await query<OrgSummaryRow>(
      `
      select o.id, o.name, o.description, o.website, o.social_links,
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
        social_links: r.social_links ?? {},
        protest_count: Number(r.protest_count),
      })),
    );
  });

  // Approved/admin: the organizations this account owns (admin sees all,
  // including unlisted), for self-service editing.
  app.get(
    "/api/organizations/mine",
    { preHandler: app.requireRole(["approved", "admin"]) },
    async (req, reply) => {
      const isAdmin = req.user.role === "admin";
      const res = await query<
        OrgSummaryRow & { owner_user_id: string | null; listed: boolean }
      >(
        `
        select o.id, o.name, o.description, o.website, o.social_links,
          o.owner_user_id, o.listed,
          count(distinct p.id) filter (
            where p.status = 'approved' and p.event_date >= current_date
          ) as protest_count
        from organizations o
        left join protest_organizations po on po.organization_id = o.id
        left join protests p on p.id = po.protest_id
        ${isAdmin ? "" : "where o.owner_user_id = $1"}
        group by o.id
        order by o.name
        `,
        isAdmin ? [] : [req.user.sub],
      );
      return reply.send(
        res.rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          website: r.website,
          social_links: r.social_links ?? {},
          owner_user_id: r.owner_user_id,
          listed: r.listed,
          protest_count: Number(r.protest_count),
        })),
      );
    },
  );

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
      const { name, description, website, social_links, listed } = parsed.data;
      const res = await query<{
        id: string;
        name: string;
        description: string | null;
        website: string | null;
        social_links: unknown;
      }>(
        `insert into organizations (name, description, website, social_links, listed, owner_user_id)
         values ($1, $2, $3, $4, $5, $6)
         returning id, name, description, website, social_links`,
        [
          name,
          description ?? null,
          website ?? null,
          JSON.stringify(social_links ?? {}),
          listed ?? false,
          req.user.sub,
        ],
      );
      return reply.code(201).send({ ...res.rows[0], protest_count: 0 });
    },
  );

  // The organization's owner (or an admin) edits its public profile. Account
  // credentials/user info stay admin-only, handled outside this endpoint.
  app.patch(
    "/api/organizations/:id",
    { preHandler: app.requireRole(["approved", "admin"]) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const isAdmin = req.user.role === "admin";

      const existing = await query<{ owner_user_id: string | null }>(
        "select owner_user_id from organizations where id = $1",
        [id],
      );
      if (!existing.rows[0]) return reply.code(404).send({ error: "not_found" });
      if (!isAdmin && existing.rows[0].owner_user_id !== req.user.sub) {
        return reply.code(403).send({ error: "forbidden" });
      }

      const parsed = updateOrgSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid_input", details: parsed.error.flatten() });
      }
      const data = parsed.data as Record<string, unknown>;
      // Only an admin may reassign which account owns this org.
      if (!isAdmin && data.owner_user_id !== undefined) {
        return reply.code(403).send({ error: "forbidden" });
      }

      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const field of ["name", "description", "website"] as const) {
        if (data[field] !== undefined) {
          sets.push(`${field} = $${i++}`);
          vals.push(data[field] === "" ? null : data[field]);
        }
      }
      if (data.social_links !== undefined) {
        sets.push(`social_links = $${i++}::jsonb`);
        vals.push(JSON.stringify(data.social_links));
      }
      if (isAdmin && data.owner_user_id !== undefined) {
        sets.push(`owner_user_id = $${i++}`);
        vals.push(data.owner_user_id);
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
        social_links: unknown;
        owner_user_id: string | null;
      }>(
        `update organizations set ${sets.join(", ")} where id = $${i}
         returning id, name, description, website, social_links, owner_user_id`,
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
