import type { FastifyInstance } from "fastify";
import { professionalController } from "./professional.controller";

export default async function professionalRoutes(app: FastifyInstance) {
  // Publica, mas usa optionalAuthenticate para que um ADMIN autenticado
  // consiga tambem listar pedidos PENDING/REJECTED/SUSPENDED.
  app.get(
    "/",
    {
      preHandler: app.optionalAuthenticate,
      schema: { tags: ["professionals"], summary: "Listar profissionais (publico ve so aprovados)" },
    },
    professionalController.list
  );

  app.get(
    "/me",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["professionals"],
        summary: "Obter o meu proprio perfil de profissional (se existir)",
        security: [{ bearerAuth: [] }],
      },
    },
    professionalController.getMine
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: app.optionalAuthenticate,
      schema: { tags: ["professionals"], summary: "Obter um profissional por id" },
    },
    professionalController.getById
  );

  app.post(
    "/",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["professionals"],
        summary: "Candidatar-me a profissional (fica PENDING ate um ADMIN aprovar)",
        security: [{ bearerAuth: [] }],
      },
    },
    professionalController.create
  );

  app.patch<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["professionals"],
        summary: "Atualizar o meu perfil de profissional (dono ou ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    professionalController.update
  );

  app.delete<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["professionals"],
        summary: "Remover um perfil de profissional (dono ou ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    professionalController.remove
  );

  // --- Acoes exclusivas de ADMIN: o RBAC pedido para "controlar profissionais" ---
  app.patch<{ Params: { id: string } }>(
    "/:id/status",
    {
      preHandler: app.authorize("ADMIN"),
      schema: {
        tags: ["professionals"],
        summary: "Aprovar, rejeitar ou suspender um profissional (ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    professionalController.updateStatus
  );

  app.patch<{ Params: { id: string } }>(
    "/:id/verified",
    {
      preHandler: app.authorize("ADMIN"),
      schema: {
        tags: ["professionals"],
        summary: "Atribuir/remover o selo de verificado (ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    professionalController.updateVerified
  );
}
