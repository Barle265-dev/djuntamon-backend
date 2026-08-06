import type { FastifyInstance } from "fastify";
import { bookingController } from "./booking.controller";

/** Sem prefixo fixo pelo mesmo motivo do modulo reviews (ver review.routes.ts). */
export default async function bookingRoutes(app: FastifyInstance) {
  app.post<{ Params: { professionalId: string } }>(
    "/professionals/:professionalId/bookings",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["bookings"],
        summary: "Agendar um servico com um profissional",
        security: [{ bearerAuth: [] }],
      },
    },
    bookingController.create
  );

  app.get(
    "/bookings/me",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["bookings"],
        summary: "Listar os meus agendamentos (como cliente)",
        security: [{ bearerAuth: [] }],
      },
    },
    bookingController.listMine
  );

  app.get<{ Params: { professionalId: string } }>(
    "/professionals/:professionalId/bookings",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["bookings"],
        summary: "Listar agendamentos recebidos (dono do perfil ou ADMIN)",
        security: [{ bearerAuth: [] }],
      },
    },
    bookingController.listForProfessional
  );

  app.patch<{ Params: { id: string } }>(
    "/bookings/:id/status",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["bookings"],
        summary: "Confirmar, concluir ou cancelar um agendamento",
        security: [{ bearerAuth: [] }],
      },
    },
    bookingController.updateStatus
  );
}
