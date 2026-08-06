import closeWithGrace from "close-with-grace";
import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

async function main() {
  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Documentacao disponivel em http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  closeWithGrace({ delay: 5000 }, async ({ err }) => {
    if (err) app.log.error(err);
    app.log.info("A encerrar o servidor...");
    await app.close();
    await prisma.$disconnect();
  });
}

main();
