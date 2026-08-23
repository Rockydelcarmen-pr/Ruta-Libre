import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { registerAuth } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { deviceRoutes } from "./routes/devices.js";
import { protestRoutes } from "./routes/protests.js";
import { organizationRoutes } from "./routes/organizations.js";
import { matchRoutes } from "./routes/match.js";
import { parkingRoutes } from "./routes/parking.js";
import { chipRoutes } from "./routes/chips.js";
import { pool } from "./db/pool.js";

async function build() {
  const app = Fastify({
    trustProxy: config.trustProxy,
    logger: {
      level: config.isProd ? "info" : "debug",
      transport: config.isProd
        ? undefined
        : { target: "pino-pretty", options: { colorize: true } },
    },
  });

  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: true,
  });

  await registerAuth(app);

  app.get("/health", async () => {
    let db = false;
    try {
      await pool.query("select 1");
      db = true;
    } catch {
      db = false;
    }
    return {
      ok: true,
      db,
      routing_configured: config.hasRoutingKey,
    };
  });

  await app.register(authRoutes);
  await app.register(deviceRoutes);
  await app.register(protestRoutes);
  await app.register(organizationRoutes);
  await app.register(matchRoutes);
  await app.register(parkingRoutes);
  await app.register(chipRoutes);

  app.setErrorHandler((err: FastifyError, _req, reply) => {
    app.log.error(err);
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    reply.code(status).send({
      error: status === 500 ? "internal_error" : (err.code ?? "error"),
      message: config.isProd ? undefined : err.message,
    });
  });

  return app;
}

build()
  .then((app) =>
    app.listen({ port: config.PORT, host: config.HOST }).then(() => {
      app.log.info(`API listening on http://${config.HOST}:${config.PORT}`);
    }),
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
