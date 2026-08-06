import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { isProduction } from "./config/env";

import securityPlugin from "./plugins/security";
import authPlugin from "./plugins/auth";
import errorHandlerPlugin from "./plugins/error-handler";
import swaggerPlugin from "./plugins/swagger";

import authRoutes from "./modules/auth/auth.routes";
import categoryRoutes from "./modules/categories/category.routes";
import professionalRoutes from "./modules/professionals/professional.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import adminRoutes from "./modules/admin/admin.routes";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: isProduction ? "info" : "debug",
      transport: isProduction ? undefined : { target: "pino-pretty" },
      // Nunca registar dados sensiveis (passwords, tokens) nos logs de pedidos.
      redact: ["req.headers.authorization"],
    },
    trustProxy: true,
    // Por omissao o Fastify limita o corpo do pedido a 1MB. O formulario de
    // registo de profissional envia a foto de perfil como data URL base64
    // dentro do JSON (sem upload de ficheiros/armazenamento de objetos neste
    // projeto), por isso o limite tem de acomodar isso. Simplificacao
    // assumida: em producao isto deveria ser um upload real (S3/objeto) com
    // URL assinada, nao base64 embutido no corpo do pedido.
    bodyLimit: 6 * 1024 * 1024, // 6MB
  });

  app.register(errorHandlerPlugin);
  app.register(sensible);
  app.register(securityPlugin);
  app.register(authPlugin);
  app.register(swaggerPlugin);

  app.get("/health", async () => ({ status: "ok" }));

  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(categoryRoutes, { prefix: "/api/categories" });
  app.register(professionalRoutes, { prefix: "/api/professionals" });
  app.register(reviewRoutes, { prefix: "/api" });
  app.register(bookingRoutes, { prefix: "/api" });
  app.register(adminRoutes, { prefix: "/api" });

  return app;
}
