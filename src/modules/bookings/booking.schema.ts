import { z } from "zod";

export const createBookingSchema = z.object({
  serviceSelected: z.string().trim().min(1).max(200),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD"),
  timeSlot: z.string().trim().min(1).max(40),
  details: z.string().trim().max(1000).default(""),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["CONFIRMADO", "CONCLUIDO", "CANCELADO"]),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
