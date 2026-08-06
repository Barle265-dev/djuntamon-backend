import { z } from "zod";

/**
 * Password forte: minimo 8 caracteres, pelo menos uma maiuscula, uma
 * minuscula e um numero. Nao exigimos simbolos para nao frustrar
 * demasiado o utilizador, mas isto ja elimina a maioria das passwords
 * triviais ("12345678", "password").
 */
const passwordSchema = z
  .string()
  .min(8, "A password deve ter pelo menos 8 caracteres")
  .max(72, "A password nao pode exceder 72 caracteres") // limite do argon2/bcrypt
  .regex(/[a-z]/, "A password deve conter pelo menos uma letra minuscula")
  .regex(/[A-Z]/, "A password deve conter pelo menos uma letra maiuscula")
  .regex(/[0-9]/, "A password deve conter pelo menos um numero");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto").max(120),
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, "Numero de telefone invalido")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalido"),
  password: z.string().min(1, "Password obrigatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
