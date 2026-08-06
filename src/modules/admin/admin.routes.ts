import type { FastifyInstance } from "fastify";
import { getDashboardStats } from "./admin.service";

/**
 * Rotas exclusivas do painel de administracao. `authorize("ADMIN")` e o
 * unico portao que decide quem entra aqui - e a base do "so admin acede
 * a pagina admin" pedido: o frontend deve esconder a UI para quem nao
 * for ADMIN, mas quem impede o acesso de facto e este middleware.
 */
export default async function adminRoutes(app: FastifyInstance) {
  app.get(
    "/admin/stats",
    {
      preHandler: app.authorize("ADMIN"),
      schema: {
        tags: ["professionals"],
        summary: "Estatisticas do painel de administracao (ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      const stats = await getDashboardStats();
      return reply.send(stats);
    }
  );
}
