import "dotenv/config";
import { z } from "zod";

/**
 * Valida as variaveis de ambiente no arranque da aplicacao.
 * Se algo estiver em falta ou mal formatado, o processo termina
 * imediatamente com uma mensagem clara em vez de falhar mais tarde
 * de forma imprevisivel a meio de um pedido.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL e obrigatorio"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres para ser seguro"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";

/** Lista de origens CORS autorizadas, separadas por virgula em CORS_ORIGIN. */
export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
