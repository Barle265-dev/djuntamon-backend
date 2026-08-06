import type { FastifyReply, FastifyRequest } from "fastify";
import { createBookingSchema, updateBookingStatusSchema } from "./booking.schema";
import * as bookingService from "./booking.service";

export const bookingController = {
  async create(
    request: FastifyRequest<{ Params: { professionalId: string } }>,
    reply: FastifyReply
  ) {
    const input = createBookingSchema.parse(request.body);
    const booking = await bookingService.createBooking(
      request.params.professionalId,
      request.user.sub,
      input
    );
    return reply.status(201).send({ booking });
  },

  async listMine(request: FastifyRequest, reply: FastifyReply) {
    const bookings = await bookingService.listMyBookings(request.user.sub);
    return reply.send({ bookings });
  },

  async listForProfessional(
    request: FastifyRequest<{ Params: { professionalId: string } }>,
    reply: FastifyReply
  ) {
    const bookings = await bookingService.listProfessionalBookings(
      request.params.professionalId,
      { sub: request.user.sub, role: request.user.role }
    );
    return reply.send({ bookings });
  },

  async updateStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = updateBookingStatusSchema.parse(request.body);
    const booking = await bookingService.updateBookingStatus(
      request.params.id,
      { sub: request.user.sub, role: request.user.role },
      input
    );
    return reply.send({ booking });
  },
};
