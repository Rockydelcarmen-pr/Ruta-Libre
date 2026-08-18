import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyJwt from "@fastify/jwt";
import { config } from "../config.js";

export type Role = "public" | "approved" | "admin";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: { sub: string; role: Role };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      roles: Role[],
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "unauthorized" });
      }
    },
  );

  app.decorate("requireRole", (roles: Role[]) => {
    return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "unauthorized" });
        return;
      }
      if (!roles.includes(req.user.role)) {
        await reply.code(403).send({ error: "forbidden" });
      }
    };
  });
}
