import type { User } from "@prisma/client";

export type PublicUser = Omit<User, "passwordHash">;

/**
 * Remove o passwordHash antes de qualquer User sair da API.
 * Usar sempre isto em vez de devolver o registo do Prisma diretamente.
 */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
