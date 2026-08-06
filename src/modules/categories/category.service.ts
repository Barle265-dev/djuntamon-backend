import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { slugify } from "../../lib/slug";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

export function listCategories(includeInactive = false) {
  return prisma.category.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          professionals: { where: { active: true } },
        },
      },
    },
  });
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError("Categoria nao encontrada");
  }
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  const id = input.id ?? slugify(input.name);

  const existing = await prisma.category.findUnique({ where: { id } });
  if (existing) {
    throw new ConflictError(`Ja existe uma categoria com o id "${id}"`);
  }

  return prisma.category.create({
    data: {
      id,
      name: input.name,
      iconName: input.iconName,
      description: input.description,
      active: input.active ?? true,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryById(id);
  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string) {
  await getCategoryById(id);
  await prisma.category.delete({ where: { id } });
}
