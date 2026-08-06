import { z } from "zod";

export const createCategorySchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "O id so pode conter minusculas, numeros e underscore")
    .min(2)
    .max(60)
    .optional(),
  name: z.string().trim().min(2).max(80),
  iconName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(500),
  active: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema
  .omit({ id: true })
  .partial();

export const listCategoriesQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
