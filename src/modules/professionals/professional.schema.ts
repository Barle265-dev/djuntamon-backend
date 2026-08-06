import { z } from "zod";

const urlOrPath = z.string().trim().min(1).max(2048);
// O avatar aceita tanto um URL curto como uma data URL base64 (upload direto
// sem armazenamento de objetos - ver nota em src/app.ts sobre bodyLimit).
const avatarField = z.string().trim().min(1).max(4_500_000);

/**
 * Campos que o proprio candidato a profissional pode preencher.
 * Note o que NAO esta aqui: status, active, verified, rating,
 * reviewsCount, jobsCount, ownerId. Esses campos so podem ser
 * alterados pelo fluxo de administracao (mass-assignment protection).
 */
export const createProfessionalSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: z.string().trim().min(1),
  island: z.string().trim().min(1).max(80),
  zone: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, "Numero de telefone invalido"),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, "Numero de WhatsApp invalido"),
  bio: z.string().trim().min(30, "Escreva uma apresentacao com pelo menos 30 caracteres").max(2000),
  avatar: avatarField,
  startingPrice: z.number().positive().max(10_000_000),
  services: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  portfolio: z.array(urlOrPath).max(20).optional().default([]),
  availability: z.string().trim().min(1).max(200),
});

/** O dono do perfil pode editar os mesmos campos, todos opcionais. */
export const updateOwnProfessionalSchema = createProfessionalSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

export const updateVerifiedSchema = z.object({
  verified: z.boolean(),
});

export const listProfessionalsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().trim().optional(),
  island: z.string().trim().optional(),
  zone: z.string().trim().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;
export type UpdateOwnProfessionalInput = z.infer<typeof updateOwnProfessionalSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListProfessionalsQuery = z.infer<typeof listProfessionalsQuerySchema>;
