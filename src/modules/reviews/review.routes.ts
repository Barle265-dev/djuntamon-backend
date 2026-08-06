import type { FastifyInstance } from "fastify";
import { reviewController } from "./review.controller";

/**
 * Registado sem prefixo fixo (ver app.ts) porque as rotas de review
 * sao aninhadas sob /professionals/:professionalId/reviews - o Fastify
 * nao permite parametros dinamicos no prefixo de um plugin.
 */
export default async function reviewRoutes(app: FastifyInstance) {
  app.get<{ Params: { professionalId: string } }>(
    "/professionals/:professionalId/reviews",
    { schema: { tags: ["reviews"], summary: "Listar avaliacoes de um profissional" } },
    reviewController.list
  );

  app.post<{ Params: { professionalId: string } }>(
    "/professionals/:professionalId/reviews",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["reviews"],
        summary: "Criar uma avaliacao (cliente autenticado, uma por profissional)",
        security: [{ bearerAuth: [] }],
      },
    },
    reviewController.create
  );

  app.delete<{ Params: { id: string } }>(
    "/reviews/:id",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["reviews"],
        summary: "Remover uma avaliacao (autor ou ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    reviewController.remove
  );
}
