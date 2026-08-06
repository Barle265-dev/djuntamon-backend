import type { FastifyInstance } from "fastify";
import { categoryController } from "./category.controller";

export default async function categoryRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      schema: { tags: ["categories"], summary: "Listar categorias ativas" },
    },
    categoryController.list
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    {
      schema: { tags: ["categories"], summary: "Obter uma categoria por id" },
    },
    categoryController.getById
  );

  app.post(
    "/",
    {
      preHandler: app.authorize("ADMIN"),
      schema: {
        tags: ["categories"],
        summary: "Criar uma categoria (ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    categoryController.create
  );

  app.patch<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: app.authorize("ADMIN"),
      schema: {
        tags: ["categories"],
        summary: "Atualizar uma categoria (ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    categoryController.update
  );

  app.delete<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: app.authorize("ADMIN"),
      schema: {
        tags: ["categories"],
        summary: "Remover uma categoria (ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    categoryController.remove
  );
}
