import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyJwt from "@fastify/jwt";
import { config } from "../config.js";
import { resolveDeviceId } from "../db/devices.js";

// Only identifiable actors carry a role: organizers ('approved') and admins.
// The public has no account; anonymous chip actions authenticate with a device
// token instead (see authenticateDevice), not a JWT.
export type Role = "approved" | "admin";

const DEVICE_TOKEN_HEADER = "x-device-token";

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
    authenticateDevice: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    /** Set by authenticateDevice: the anonymous device id for this request. */
    deviceId?: string;
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

  // Anonymous device auth: reads the x-device-token header and resolves it to a
  // device id. Used by community-chip actions, which need only "same device",
  // never a personal account.
  app.decorate(
    "authenticateDevice",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const header = req.headers[DEVICE_TOKEN_HEADER];
      const token = Array.isArray(header) ? header[0] : header;
      if (!token) {
        await reply.code(401).send({ error: "missing_device_token" });
        return;
      }
      const deviceId = await resolveDeviceId(token);
      if (!deviceId) {
        await reply.code(401).send({ error: "invalid_device_token" });
        return;
      }
      req.deviceId = deviceId;
    },
  );
}
