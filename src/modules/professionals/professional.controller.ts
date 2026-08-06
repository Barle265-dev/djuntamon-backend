import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createProfessionalSchema,
  listProfessionalsQuerySchema,
  updateOwnProfessionalSchema,
  updateStatusSchema,
  updateVerifiedSchema,
} from "./professional.schema";
import * as professionalService from "./professional.service";

/**
 * `request.user` so existe em runtime se `authenticate`/`optionalAuthenticate`
 * correu antes (o tipo do @fastify/jwt nao o marca como opcional, por isso
 * validamos explicitamente aqui em vez de confiar so no compilador).
 */
function getRequester(request: FastifyRequest) {
  return request.user ? { sub: request.user.sub, role: request.user.role } : undefined;
}

export const professionalController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listProfessionalsQuerySchema.parse(request.query);
    const result = await professionalService.listProfessionals(query, getRequester(request));
    return reply.send(result);
  },

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const professional = await professionalService.getProfessionalById(
      request.params.id,
      getRequester(request)
    );
    return reply.send({ professional });
  },

  async getMine(request: FastifyRequest, reply: FastifyReply) {
    const professional = await professionalService.getMyProfessional(request.user.sub);
    return reply.send({ professional });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createProfessionalSchema.parse(request.body);
    const professional = await professionalService.createProfessional(request.user.sub, input);
    return reply.status(201).send({ professional });
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = updateOwnProfessionalSchema.parse(request.body);
    const professional = await professionalService.updateOwnProfessional(
      request.params.id,
      { sub: request.user.sub, role: request.user.role },
      input
    );
    return reply.send({ professional });
  },

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await professionalService.deleteProfessional(request.params.id, {
      sub: request.user.sub,
      role: request.user.role,
    });
    return reply.status(204).send();
  },

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = updateStatusSchema.parse(request.body);
    const professional = await professionalService.updateProfessionalStatus(
      request.params.id,
      request.user.sub,
      input
    );
    return reply.send({ professional });
  },

  async updateVerified(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = updateVerifiedSchema.parse(request.body);
    const professional = await professionalService.setProfessionalVerified(
      request.params.id,
      input.verified
    );
    return reply.send({ professional });
  },
};
