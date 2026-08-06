import type { FastifyReply, FastifyRequest } from "fastify";
import { createReviewSchema } from "./review.schema";
import * as reviewService from "./review.service";

export const reviewController = {
  async list(
    request: FastifyRequest<{ Params: { professionalId: string } }>,
    reply: FastifyReply
  ) {
    const reviews = await reviewService.listReviewsByProfessional(request.params.professionalId);
    return reply.send({ reviews });
  },

  async create(
    request: FastifyRequest<{ Params: { professionalId: string } }>,
    reply: FastifyReply
  ) {
    const input = createReviewSchema.parse(request.body);
    const review = await reviewService.createReview(
      request.params.professionalId,
      request.user.sub,
      input
    );
    return reply.status(201).send({ review });
  },

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await reviewService.deleteReview(request.params.id, {
      sub: request.user.sub,
      role: request.user.role,
    });
    return reply.status(204).send();
  },
};
