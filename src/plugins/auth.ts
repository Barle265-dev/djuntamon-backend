import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import type { Role } from "@prisma/client";
import { env } from "../config/env";
import { UnauthorizedError, ForbiddenError } from "../lib/errors";

/**
 * Autenticacao (JWT) e autorizacao (RBAC) da API.
 *
 * - `authenticate`: exige um Bearer token valido; preenche `request.user`
 *   com `{ sub, role }` extraidos do token.
 * - `authorize(...roles)`: alem de autenticar, garante que o utilizador
 *   tem um dos papeis indicados. Usar nas rotas que so ADMIN (ou outro
 *   papel especifico) pode aceder - e o mecanismo central de RBAC pedido:
 *   so ADMIN pode gerir a pagina/admin e controlar profissionais
 *   (aprovar/rejeitar/verificar/suspender).
 */
export default fp(async function authPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  app.decorate("authenticate", async function authenticate(
    request: FastifyRequest,
    _reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError("Token de autenticacao ausente ou invalido");
    }
  });

  app.decorate("optionalAuthenticate", async function optionalAuthenticate(
    request: FastifyRequest,
    _reply: FastifyReply
  ) {
    const header = request.headers.authorization;
    if (!header) return;
    try {
      await request.jwtVerify();
    } catch {
      // Token presente mas invalido/expirado: trata-se como visitante anonimo
      // em vez de bloquear rotas publicas que so usam a identidade quando existe.
    }
  });

  app.decorate("authorize", function authorize(...roles: Role[]) {
    return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
      await app.authenticate(request, reply);
      if (!roles.includes(request.user.role)) {
        throw new ForbiddenError(
          `Esta acao requer um dos seguintes papeis: ${roles.join(", ")}`
        );
      }
    };
  });
});
