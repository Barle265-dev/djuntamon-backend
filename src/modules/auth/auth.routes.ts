import type { FastifyInstance } from "fastify";
import { buildAuthController } from "./auth.controller";

/** Rate limit mais apertado nas rotas sensiveis a forca bruta. */
const bruteForceGuard = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 minute",
    },
  },
};

export default async function authRoutes(app: FastifyInstance) {
  const controller = buildAuthController(app);

  app.post(
    "/register",
    {
      ...bruteForceGuard,
      schema: {
        tags: ["auth"],
        summary: "Criar uma conta de cliente",
        body: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string" },
            phone: { type: "string" },
          },
        },
      },
    },
    controller.register
  );

  app.post(
    "/login",
    {
      ...bruteForceGuard,
      schema: {
        tags: ["auth"],
        summary: "Autenticar e obter um token JWT",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
      },
    },
    controller.login
  );

  app.get(
    "/me",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["auth"],
        summary: "Obter os dados do utilizador autenticado",
        security: [{ bearerAuth: [] }],
      },
    },
    controller.me
  );
}
