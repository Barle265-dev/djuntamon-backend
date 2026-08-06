import "fastify";
import "@fastify/jwt";
import type { Role } from "@prisma/client";

/** Payload assinado dentro do JWT. Mantido minimo de proposito. */
export interface JwtPayload {
  sub: string; // user id
  role: Role;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** Decorator: exige um JWT valido. Preenche request.user. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Decorator: se vier um Bearer token valido preenche request.user; caso contrario segue como anonimo. */
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Decorator factory: exige autenticacao + um dos papeis indicados. */
    authorize: (
      ...roles: Role[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
