import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

/**
 * Documentacao OpenAPI servida em /docs. Cada rota preenche o seu
 * `schema` (ver os ficheiros routes.ts de cada modulo) e aparece aqui
 * automaticamente.
 */
export default fp(async function swaggerPlugin(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Djunta Mon API",
        description:
          "API da plataforma de profissionais locais de Cabo Verde. " +
          "Autenticacao via Bearer JWT (Authorization: Bearer <token>).",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "auth", description: "Registo, login e sessao" },
        { name: "categories", description: "Categorias de servico" },
        { name: "professionals", description: "Perfis de profissionais e fluxo de aprovacao" },
        { name: "reviews", description: "Avaliacoes de clientes" },
        { name: "bookings", description: "Agendamentos de servicos" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });
});
