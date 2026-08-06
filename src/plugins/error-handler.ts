import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
import { isProduction } from "../config/env";

/**
 * Handler de erros centralizado. Garante que:
 *  - erros de validacao (Zod) voltam como 400 com detalhes uteis ao cliente;
 *  - erros de dominio (AppError) voltam com o status/code corretos;
 *  - erros de constraint do Prisma (ex: email duplicado) voltam como 409;
 *  - qualquer outro erro (bug, falha de infra) volta como 500 SEM detalhes
 *    internos nem stack trace expostos ao cliente - isso e so para o log.
 */
export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Dados invalidos",
        details: error.flatten().fieldErrors,
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return reply.status(409).send({
          error: "CONFLICT",
          message: "Ja existe um registo com estes dados (valor duplicado).",
        });
      }
      if (error.code === "P2025") {
        return reply.status(404).send({
          error: "NOT_FOUND",
          message: "Recurso nao encontrado.",
        });
      }
      if (error.code === "P2003") {
        return reply.status(409).send({
          error: "CONFLICT",
          message: "Este registo esta a ser usado por outros dados e nao pode ser removido/alterado.",
        });
      }
    }

    // Erros do proprio Fastify (ex: rate limit, payload demasiado grande, JSON invalido)
    if ("statusCode" in error && typeof error.statusCode === "number" && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: "REQUEST_ERROR",
        message: error.message,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: isProduction
        ? "Ocorreu um erro inesperado. Tente novamente mais tarde."
        : error.message,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "NOT_FOUND",
      message: `Rota ${request.method} ${request.url} nao existe.`,
    });
  });
});
