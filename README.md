# Djunta Mon — Backend

API REST da plataforma **Djunta Mon** (profissionais locais de Cabo Verde), construída em **Node.js + Fastify + TypeScript + Prisma ORM + PostgreSQL**, para servir o frontend em `../centro-profissionais`.

## Stack

| Camada | Tecnologia | Porquê |
|---|---|---|
| Servidor HTTP | [Fastify 5](https://fastify.dev) | Mais rápido que Express, validação/serialização nativa por schema, ecossistema de plugins maduro para segurança |
| ORM / BD | [Prisma](https://prisma.io) + PostgreSQL | Migrations tipadas, queries parametrizadas por omissão (proteção contra SQL injection nativa) |
| Validação | [Zod](https://zod.dev) | Schemas tipados partilhados entre validação e tipos TypeScript, sem duplicar definições |
| Password hashing | [argon2](https://www.npmjs.com/package/argon2) (argon2id) | Recomendação atual da OWASP, resistente a GPU/ASIC, melhor que bcrypt |
| Autenticação | [@fastify/jwt](https://github.com/fastify/fastify-jwt) | Bearer JWT stateless |
| Segurança HTTP | @fastify/helmet, @fastify/cors, @fastify/rate-limit | Cabeçalhos seguros, CORS restrito, rate limiting |
| Documentação | @fastify/swagger + swagger-ui | OpenAPI gerado a partir dos schemas de rota, em `/docs` |

## Arquitetura

Organização em módulos por domínio, cada um dividido em camadas (routes → controller → service → Prisma), para que a lógica de negócio nunca dependa diretamente do objeto HTTP:

```
src/
├── app.ts                  # monta a instância Fastify e regista plugins/rotas
├── server.ts                # ponto de entrada (listen + graceful shutdown)
├── config/
│   ├── env.ts               # valida process.env com Zod no arranque (fail-fast)
│   └── prisma.ts            # instância única do PrismaClient
├── lib/
│   ├── errors.ts             # AppError e subclasses (BadRequest/Unauthorized/Forbidden/NotFound/Conflict)
│   ├── password.ts           # hash/verify com argon2id
│   ├── serializers.ts        # remove passwordHash antes de qualquer resposta
│   └── slug.ts               # gera o id de uma categoria a partir do nome
├── plugins/
│   ├── security.ts           # helmet + cors + rate-limit
│   ├── auth.ts                # regista @fastify/jwt + decorators authenticate/authorize/optionalAuthenticate
│   ├── error-handler.ts       # handler de erros central (Zod, AppError, Prisma, fallback 500)
│   └── swagger.ts             # OpenAPI em /docs
├── types/
│   └── fastify.d.ts          # augmentation dos tipos do Fastify/@fastify/jwt
└── modules/
    ├── auth/                 # registo, login, /me
    ├── users/                 # acesso a User (usado por auth)
    ├── categories/            # CRUD de categorias (escrita = ADMIN)
    ├── professionals/         # candidatura, edição, aprovação/rejeição, selo verificado
    ├── reviews/                # avaliações de clientes autenticados
    ├── bookings/               # agendamento de serviços
    └── admin/                  # estatísticas do painel administrativo
```

Cada módulo segue o padrão:
- **`*.schema.ts`** — validação Zod dos inputs (também a fonte da tipagem TS via `z.infer`);
- **`*.service.ts`** — regras de negócio e acesso a dados (Prisma). Não sabe nada de HTTP;
- **`*.controller.ts`** — traduz `FastifyRequest`/`FastifyReply` para chamadas ao service;
- **`*.routes.ts`** — liga URLs + middlewares (`authenticate`/`authorize`) aos controllers.

## RBAC (controlo de acesso)

Três papéis (`Role` no schema Prisma): `CLIENT`, `PROFESSIONAL`, `ADMIN`.

- **Ninguém se regista como ADMIN.** A única forma de existir um admin é via `prisma/seed.ts`, que lê `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env`. Promover outro utilizador a admin é uma operação manual na base de dados (`UPDATE users SET role = 'ADMIN' WHERE email = ...`) — deliberadamente fora da API, para não existir nenhum endpoint que possa ser abusado para auto-promoção.
- **Candidatar-se a profissional é aberto a qualquer `CLIENT` autenticado** (`POST /api/professionals`), mas o registo nasce sempre com `status: PENDING` e `active: false` — **invisível ao público**.
- **Só um `ADMIN` pode:**
  - listar profissionais com qualquer `status` (pendentes, rejeitados, suspensos);
  - aprovar/rejeitar/suspender (`PATCH /api/professionals/:id/status`);
  - atribuir/remover o selo de verificado (`PATCH /api/professionals/:id/verified`);
  - gerir categorias (`POST`/`PATCH`/`DELETE /api/categories`);
  - ver as estatísticas do painel (`GET /api/admin/stats`).
- **O dono de um perfil de profissional** pode editar os seus próprios dados de negócio (bio, preço, serviços, disponibilidade, ...) via `PATCH /api/professionals/:id`, mas o schema Zod dessa rota **não inclui** `status`, `active`, `verified`, `rating`, `reviewsCount` nem `ownerId` — são geridos exclusivamente pelo backend, nunca aceites do cliente (proteção contra mass assignment).
- O middleware que aplica tudo isto é `app.authorize("ADMIN")` (ver `src/plugins/auth.ts`): verifica o JWT e confirma o `role` antes de deixar a rota executar. `app.authenticate` exige só login; `app.optionalAuthenticate` deixa a rota pública mas identifica quem estiver logado (usado em `GET /api/professionals` para o admin também poder ver pendentes na mesma rota pública).

## Segurança

- **Passwords**: argon2id (memória 19 MB, não reversível, resistente a ataques por hardware dedicado). Nunca é devolvido `passwordHash` em nenhuma resposta (`toPublicUser`).
- **JWT**: assinado com `JWT_SECRET` (mínimo 32 caracteres, validado no arranque), expira em `JWT_EXPIRES_IN` (por omissão 7 dias). *Simplificação assumida*: não há refresh tokens nesta versão — expirado, o utilizador tem de voltar a fazer login. Documentado aqui para não ser assumido como esquecimento.
- **Validação de input**: todos os `body`/`query`/`params` passam por um schema Zod antes de tocar em qualquer lógica — nada chega ao Prisma sem ser validado e sem os campos serem explicitamente lidos (whitelist, não blacklist).
- **SQL Injection**: o Prisma Client gera sempre queries parametrizadas; este projeto não usa `$queryRawUnsafe` em lado nenhum. Testado manualmente com payloads `' OR '1'='1` na pesquisa de profissionais sem qualquer efeito.
- **Mass assignment**: cada schema de escrita lista exatamente os campos aceites; campos sensíveis (`role`, `verified`, `active`, `status`, `ownerId`, `rating`) nunca fazem parte de um schema de input do cliente.
- **User enumeration**: `POST /api/auth/login` devolve a mesma mensagem de erro para "email não existe" e "password errada", e ainda executa um hash Argon2 no caso de email inexistente para igualar o tempo de resposta.
- **Rate limiting**: 100 pedidos/minuto globais (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW`), e 10/minuto especificamente em `/auth/register` e `/auth/login` para dificultar força bruta.
- **Cabeçalhos HTTP**: `@fastify/helmet` (CSP, X-Content-Type-Options, etc.).
- **CORS**: restrito à(s) origem(ns) em `CORS_ORIGIN` (por omissão, o Vite dev server do frontend).
- **Erros**: em produção (`NODE_ENV=production`), qualquer erro não tratado explicitamente volta como `"Ocorreu um erro inesperado"` — nunca stack traces nem mensagens internas do Postgres/Prisma são expostas ao cliente; vão só para o log do servidor.
- **Variáveis de ambiente**: validadas com Zod no arranque (`src/config/env.ts`) — se faltar `DATABASE_URL` ou `JWT_SECRET` for demasiado curto, o processo nem chega a arrancar.

## Modelo de dados

Ver `prisma/schema.prisma`. Resumo das entidades:

- **User** — conta + `role`. Um `Professional` pertence sempre a um `User` (`ownerId` único).
- **Category** — categorias de serviço (Eletricista, Canalizador, ...). Escrita restrita a ADMIN.
- **Professional** — perfil público. `status` (`PENDING`/`APPROVED`/`REJECTED`/`SUSPENDED`) e `active` controlam a visibilidade; `verified` é um selo independente atribuído pelo ADMIN. `rating`/`reviewsCount` são recalculados automaticamente a partir da tabela `Review` sempre que uma avaliação é criada ou apagada.
- **Review** — uma avaliação por cliente por profissional (`@@unique([professionalId, authorId])`), exige autenticação (ao contrário do formulário anónimo do protótipo de frontend — decisão deliberada para evitar reviews falsas).
- **Booking** — pedido de agendamento; `jobsCount` do profissional incrementa quando o estado passa a `CONCLUIDO`.

## Configuração local

### 1. Base de dados PostgreSQL

Este projeto assume um PostgreSQL já instalado e a correr localmente (porta 5432). Sem Docker.

```sql
-- ligado como superuser (psql -U postgres):
CREATE DATABASE djuntamon;
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Preenche pelo menos:
- `DATABASE_URL` — string de ligação ao Postgres;
- `JWT_SECRET` — gera um valor forte:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenciais do primeiro administrador (usadas só pelo seed).

### 3. Instalar, migrar e semear

```bash
npm install
npm run prisma:migrate   # cria as tabelas (prisma migrate dev)
npm run db:seed          # cria as categorias, o admin e 3 profissionais de exemplo
```

### 4. Arrancar

```bash
npm run dev       # tsx watch, com reload automático
# ou, para produção:
npm run build
npm start
```

- API: `http://localhost:4000/api`
- Documentação interativa (Swagger UI): `http://localhost:4000/docs`
- Health check: `http://localhost:4000/health`

### Credenciais de demonstração (após `npm run db:seed`)

| Papel | Email | Password |
|---|---|---|
| ADMIN | valor de `ADMIN_EMAIL` no `.env` | valor de `ADMIN_PASSWORD` no `.env` |
| PROFESSIONAL (exemplo) | `carlos.semedo@example.cv` | `Demo1234` |
| PROFESSIONAL (exemplo) | `arlindo.delgado@example.cv` | `Demo1234` |
| PROFESSIONAL (exemplo) | `vera.lopes@example.cv` | `Demo1234` |

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Arranca em modo desenvolvimento com reload automático |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Corre a versão compilada (produção) |
| `npm run typecheck` | Só verifica tipos, sem gerar ficheiros |
| `npm run prisma:migrate` | Cria/aplica uma migration em desenvolvimento |
| `npm run prisma:deploy` | Aplica migrations existentes (produção/CI) |
| `npm run prisma:studio` | Interface visual para explorar a base de dados |
| `npm run db:seed` | Popula a base de dados (categorias, admin, exemplos) |

## Documentação da API

Ver [`docs/API.md`](docs/API.md) para a referência completa de endpoints, ou `/docs` (Swagger UI) com o servidor a correr.

## Ligação com o frontend

O frontend (`../centro-profissionais`) já está ligado a esta API (deixou de usar dados mock em `localStorage`). Componentes principais do lado do frontend:

- `src/lib/api.ts` — cliente HTTP fino sobre `fetch`, com mapeamento das respostas do Prisma para a forma que os componentes esperam, e injeção automática do `Authorization: Bearer <token>` quando existe sessão.
- `src/lib/token.ts` — persistência do JWT em `localStorage`.
- `src/store.ts` (Zustand) — sessão (`login`/`register`/`logout`/`loadSession`) e dados (`fetchCategories`/`fetchProfessionals` + mutações que chamam a API).
- `src/pages/LoginPage.tsx` — login/registo (rota `/entrar`).

Para correr os dois em conjunto: backend em `http://localhost:4000` (este projeto) e frontend em `http://localhost:3000` (`npm run dev` em `centro-profissionais`, que lê `VITE_API_URL` do seu próprio `.env`). `CORS_ORIGIN` aqui já aponta para `http://localhost:3000` por omissão.
