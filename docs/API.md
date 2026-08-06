# Referência da API — Djunta Mon

Base URL: `http://localhost:4000/api`
Autenticação: `Authorization: Bearer <token>` (obtido em `/auth/login` ou `/auth/register`)

A versão navegável (Swagger UI) está sempre disponível em `/docs` com o servidor a correr, e reflete exatamente o schema de cada rota.

Legenda de acesso: 🌐 público · 🔒 autenticado · 👑 ADMIN · 🔧 dono do recurso ou ADMIN

---

## Auth

### `POST /auth/register` 🌐
Cria uma conta com papel `CLIENT`.

```json
// body
{ "name": "Maria Cliente", "email": "maria@example.cv", "password": "Senha1234", "phone": "+238 999 11 22" }
```
`201` → `{ "user": {...}, "token": "..." }`

### `POST /auth/login` 🌐
```json
{ "email": "maria@example.cv", "password": "Senha1234" }
```
`200` → `{ "user": {...}, "token": "..." }`
`401` se as credenciais estiverem erradas (mensagem igual quer o email exista quer não).

### `GET /auth/me` 🔒
`200` → `{ "user": {...} }`

---

## Categorias

### `GET /categories` 🌐
Lista categorias ativas. Um ADMIN autenticado pode passar `?includeInactive=true` para ver também as inativas.

### `GET /categories/:id` 🌐

### `POST /categories` 👑
```json
{ "name": "Jardinagem", "iconName": "Leaf", "description": "Manutenção de jardins e espaços verdes." }
```
`id` é opcional (gerado a partir do `name` se omitido).

### `PATCH /categories/:id` 👑
Qualquer subconjunto dos campos de criação.

### `DELETE /categories/:id` 👑
`409` se ainda existirem profissionais associados (constraint `onDelete: Restrict`).

---

## Profissionais

### `GET /professionals` 🌐 (admin vê mais)
Query params: `search`, `categoryId`, `island`, `zone`, `minRating`, `page`, `pageSize`, e `status` (só tem efeito para um ADMIN autenticado — visitantes/clientes veem sempre só `APPROVED` + `active`).

`200` → `{ "items": [...], "total": n, "page": 1, "pageSize": 20 }`

### `GET /professionals/:id` 🌐 (admin/dono veem pendentes)
Um perfil `PENDING`/`REJECTED`/`SUSPENSO` devolve `404` para quem não for o dono nem ADMIN (não revela que existe).

### `GET /professionals/me` 🔒
Devolve o perfil de profissional do utilizador autenticado, ou `professional: null` se ainda não se candidatou.

### `POST /professionals` 🔒
Candidatura a profissional. Fica sempre `status: PENDING`, `active: false`. Um utilizador só pode ter um perfil (`409` se já existir).

```json
{
  "name": "Carlos Semedo",
  "categoryId": "eletricista",
  "island": "Santiago",
  "zone": "Praia (Palmarejo)",
  "phone": "+238 991 34 52",
  "whatsapp": "+238 991 34 52",
  "bio": "Eletricista certificado com mais de 8 anos de experiência...",
  "avatar": "https://.../avatar.jpg",
  "startingPrice": 1500,
  "services": ["Instalação de tomadas", "Diagnóstico de curtos-circuitos"],
  "portfolio": [],
  "availability": "Segunda a Sábado, 08:00 - 18:00"
}
```

### `PATCH /professionals/:id` 🔧
Atualiza os dados de negócio do perfil (mesmos campos do `POST`, todos opcionais). **Não aceita** `status`/`active`/`verified`/`rating`/`ownerId` — esses campos são ignorados mesmo que enviados.

### `DELETE /professionals/:id` 🔧
Remove o perfil (o dono pode desistir da candidatura, ou um ADMIN remover).

### `PATCH /professionals/:id/status` 👑
```json
{ "status": "APPROVED" }
// ou
{ "status": "REJECTED", "rejectionReason": "Dados de contacto inválidos" }
```
`APPROVED` → o perfil fica público (`active: true`). `REJECTED`/`SUSPENDED` → `active: false`.

### `PATCH /professionals/:id/verified` 👑
```json
{ "verified": true }
```
Selo de confiança, independente do `status`.

---

## Avaliações (Reviews)

### `GET /professionals/:professionalId/reviews` 🌐

### `POST /professionals/:professionalId/reviews` 🔒
Uma avaliação por cliente por profissional; não pode avaliar o seu próprio perfil.
```json
{ "rating": 5, "comment": "Excelente profissional, resolveu tudo rapidamente." }
```
Recalcula automaticamente `rating`/`reviewsCount` do profissional.

### `DELETE /reviews/:id` 🔧 (autor ou ADMIN)

---

## Agendamentos (Bookings)

### `POST /professionals/:professionalId/bookings` 🔒
```json
{ "serviceSelected": "Instalação elétrica", "date": "2026-09-01", "timeSlot": "10:00", "details": "Preciso de ajuda urgente." }
```

### `GET /bookings/me` 🔒
Os meus agendamentos como cliente.

### `GET /professionals/:professionalId/bookings` 🔧
Agendamentos recebidos (dono do perfil de profissional, ou ADMIN).

### `PATCH /bookings/:id/status` 🔒 (regras abaixo)
```json
{ "status": "CONFIRMADO" }
```
- `CANCELADO`: cliente, profissional dono ou ADMIN.
- `CONFIRMADO`/`CONCLUIDO`: só o profissional dono ou ADMIN. Ao marcar `CONCLUIDO`, o `jobsCount` do profissional é incrementado.

---

## Admin

### `GET /admin/stats` 👑
```json
{
  "categories": { "total": 9, "active": 9 },
  "professionals": { "total": 12, "active": 10, "verified": 6, "pendingApproval": 2 }
}
```

---

## Formato de erro

Todas as respostas de erro seguem a mesma forma:

```json
{ "error": "VALIDATION_ERROR", "message": "Dados invalidos", "details": { "email": ["Email invalido"] } }
```

| Código HTTP | `error` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Corpo/query/params falharam a validação Zod (`details` tem os campos) |
| 400 | `BAD_REQUEST` | Regra de negócio violada (ex: avaliar o próprio perfil) |
| 401 | `UNAUTHORIZED` | Token ausente/inválido/expirado, ou credenciais de login erradas |
| 403 | `FORBIDDEN` | Autenticado, mas sem permissão (papel errado ou não é o dono) |
| 404 | `NOT_FOUND` | Recurso inexistente (ou existente mas não visível ao pedinte) |
| 409 | `CONFLICT` | Valor duplicado (email, categoria) ou recurso ainda referenciado por outro |
| 500 | `INTERNAL_SERVER_ERROR` | Erro inesperado — mensagem genérica em produção, detalhe real em desenvolvimento |
