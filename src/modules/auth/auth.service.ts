import { hashPassword, verifyPassword } from "../../lib/password";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { createUser, findUserByEmail } from "../users/user.service";
import type { RegisterInput, LoginInput } from "./auth.schema";

/**
 * Regista um novo utilizador com papel CLIENT por omissao.
 * Ninguem se regista como ADMIN ou PROFESSIONAL diretamente:
 *  - ADMIN so existe via seed/promocao manual na base de dados;
 *  - tornar-se profissional e um pedido feito depois de ter conta
 *    (POST /professionals), sujeito a aprovacao do ADMIN.
 */
export async function registerUser(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("Ja existe uma conta registada com este email");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    phone: input.phone,
  });

  return user;
}

export async function authenticateUser(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  // Mensagem identica quer o email nao exista quer a password esteja errada:
  // evita que um atacante descubra quais emails estao registados (user enumeration).
  const invalidCredentialsError = new UnauthorizedError("Email ou password incorretos");

  if (!user) {
    // Ainda assim corre um hash para manter o tempo de resposta semelhante
    // ao caso de sucesso, mitigando timing attacks de enumeracao de utilizador.
    await verifyPassword(
      "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      input.password
    );
    throw invalidCredentialsError;
  }

  const validPassword = await verifyPassword(user.passwordHash, input.password);
  if (!validPassword) {
    throw invalidCredentialsError;
  }

  return user;
}
