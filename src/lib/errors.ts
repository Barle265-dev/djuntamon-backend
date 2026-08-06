/**
 * Erros de dominio tipados. O error handler global (src/plugins/error-handler.ts)
 * sabe traduzir cada um destes para o status HTTP correto, e qualquer outro
 * erro nao reconhecido e tratado como 500 sem vazar detalhes internos.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Pedido invalido") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticacao necessaria") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Sem permissao para esta acao") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso nao encontrado") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito com o estado atual do recurso") {
    super(message, 409, "CONFLICT");
  }
}
