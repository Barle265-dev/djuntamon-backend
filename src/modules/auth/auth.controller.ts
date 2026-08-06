import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { loginSchema, registerSchema } from "./auth.schema";
import { authenticateUser, registerUser } from "./auth.service";
import { toPublicUser } from "../../lib/serializers";
import { findUserById } from "../users/user.service";
import { NotFoundError } from "../../lib/errors";

export function buildAuthController(app: FastifyInstance) {
  return {
    async register(request: FastifyRequest, reply: FastifyReply) {
      const input = registerSchema.parse(request.body);
      const user = await registerUser(input);
      const token = app.jwt.sign({ sub: user.id, role: user.role });
      return reply.status(201).send({ user: toPublicUser(user), token });
    },

    async login(request: FastifyRequest, reply: FastifyReply) {
      const input = loginSchema.parse(request.body);
      const user = await authenticateUser(input);
      const token = app.jwt.sign({ sub: user.id, role: user.role });
      return reply.send({ user: toPublicUser(user), token });
    },

    async me(request: FastifyRequest, reply: FastifyReply) {
      const user = await findUserById(request.user.sub);
      if (!user) {
        throw new NotFoundError("Utilizador nao encontrado");
      }
      return reply.send({ user: toPublicUser(user) });
    },
  };
}
