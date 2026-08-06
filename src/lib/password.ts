import argon2 from "argon2";

/**
 * Argon2id e o algoritmo recomendado atualmente (OWASP) para hashing de
 * passwords: resistente a ataques por GPU/ASIC e a side-channel timing
 * attacks, ao contrario de bcrypt/sha em bruto.
 */
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, recomendacao OWASP para argon2id
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Hash corrompido/formato inesperado - falha fechada (nega acesso).
    return false;
  }
}
