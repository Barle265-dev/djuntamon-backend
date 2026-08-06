import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { corsOrigins, env } from "../config/env";

/**
 * Cabecalhos de seguranca, CORS restrito e rate limiting global.
 * Isto e a primeira linha de defesa contra XSS via cabecalhos, CSRF
 * cross-origin indevido, e forca bruta/DoS basico.
 */
export default fp(async function securityPlugin(app: FastifyInstance) {
  await app.register(helmet, {
    // API pura (sem HTML servido), por isso a CSP por omissao do helmet
    // pode ser mantida estrita sem quebrar nada.
    global: true,
  });

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    allowList: [],
    ban: 0,
  });
});
