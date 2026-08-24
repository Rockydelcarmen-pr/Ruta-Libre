import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db/pool.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { hashAccessKey } from "../lib/accessKey.js";
import type { Role } from "../plugins/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  access_key: z.string().min(1),
  preferred_language: z.enum(["en", "es"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface AccessKeyRow {
  id: string;
  role_grant: Role;
  used_by: string | null;
  expires_at: string | null;
}

interface UserRow {
  id: string;
  password_hash: string;
  role: Role;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/register-with-key", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const { email, password, access_key, preferred_language } = parsed.data;
    const keyHash = hashAccessKey(access_key);

    const keyRes = await query<AccessKeyRow>(
      "select id, role_grant, used_by, expires_at from access_keys where key_hash = $1",
      [keyHash],
    );
    const key = keyRes.rows[0];
    if (!key) return reply.code(400).send({ error: "invalid_access_key" });
    if (key.used_by) return reply.code(400).send({ error: "access_key_used" });
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return reply.code(400).send({ error: "access_key_expired" });
    }

    const existing = await query("select id from users where email = $1", [
      email,
    ]);
    if (existing.rows[0]) return reply.code(409).send({ error: "email_taken" });

    const passwordHash = await hashPassword(password);
    const userRes = await query<{ id: string; role: Role }>(
      `insert into users (email, password_hash, role, preferred_language)
       values ($1, $2, $3, $4)
       returning id, role`,
      [email, passwordHash, key.role_grant, preferred_language ?? "en"],
    );
    const user = userRes.rows[0]!;
    await query(
      "update access_keys set used_by = $1, used_at = now() where id = $2",
      [user.id, key.id],
    );

    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    return reply.code(201).send({
      token,
      user: { id: user.id, email, role: user.role },
    });
  });

  app.post("/api/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const { email, password } = parsed.data;

    const res = await query<UserRow>(
      "select id, password_hash, role from users where email = $1",
      [email],
    );
    const user = res.rows[0];
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    return reply.send({ token, user: { id: user.id, email, role: user.role } });
  });

  // Admin: list organizer/admin accounts, to assign an organization's owner.
  app.get(
    "/api/users",
    { preHandler: app.requireRole(["admin"]) },
    async (_req, reply) => {
      const res = await query<{ id: string; email: string; role: Role }>(
        "select id, email, role from users order by email",
      );
      return reply.send(res.rows);
    },
  );
}
