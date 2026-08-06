import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./category.schema";
import * as categoryService from "./category.service";

export const categoryController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listCategoriesQuerySchema.parse(request.query);
    // So um ADMIN autenticado pode pedir as categorias inativas tambem.
    const includeInactive = Boolean(query.includeInactive) && request.user?.role === "ADMIN";
    const categories = await categoryService.listCategories(includeInactive);
    return reply.send({ categories });
  },

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const category = await categoryService.getCategoryById(request.params.id);
    return reply.send({ category });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = createCategorySchema.parse(request.body);
    const category = await categoryService.createCategory(input);
    return reply.status(201).send({ category });
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const input = updateCategorySchema.parse(request.body);
    const category = await categoryService.updateCategory(request.params.id, input);
    return reply.send({ category });
  },

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await categoryService.deleteCategory(request.params.id);
    return reply.status(204).send();
  },
};
