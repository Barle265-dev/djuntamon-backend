import { Prisma, type Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/errors";
import type {
  CreateProfessionalInput,
  ListProfessionalsQuery,
  UpdateOwnProfessionalInput,
  UpdateStatusInput,
} from "./professional.schema";

export interface Requester {
  sub: string;
  role: Role;
}

const publicListInclude = {
  category: { select: { id: true, name: true, iconName: true } },
} satisfies Prisma.ProfessionalInclude;

/**
 * Lista profissionais aplicando as regras de visibilidade:
 *  - visitantes/clientes so veem perfis aprovados e ativos;
 *  - um ADMIN pode filtrar por qualquer `status` (ex: ver os PENDING
 *    para os rever).
 */
export async function listProfessionals(query: ListProfessionalsQuery, requester?: Requester) {
  const isAdmin = requester?.role === "ADMIN";

  const where: Prisma.ProfessionalWhereInput = isAdmin
    ? { status: query.status }
    : { status: "APPROVED", active: true };

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.island) where.island = query.island;
  if (query.zone) where.zone = query.zone;
  if (query.minRating) where.rating = { gte: query.minRating };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { bio: { contains: query.search, mode: "insensitive" } },
      { services: { has: query.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      include: publicListInclude,
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.professional.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getProfessionalById(id: string, requester?: Requester) {
  const professional = await prisma.professional.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, iconName: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!professional) {
    throw new NotFoundError("Profissional nao encontrado");
  }

  const isOwner = requester?.sub === professional.ownerId;
  const isAdmin = requester?.role === "ADMIN";
  const isPublic = professional.status === "APPROVED" && professional.active;

  if (!isPublic && !isOwner && !isAdmin) {
    // Um perfil pendente/rejeitado/suspenso nao existe para o publico.
    throw new NotFoundError("Profissional nao encontrado");
  }

  return professional;
}

export function getMyProfessional(ownerId: string) {
  return prisma.professional.findUnique({
    where: { ownerId },
    include: { category: { select: { id: true, name: true, iconName: true } } },
  });
}

/**
 * Auto-registo de profissional. Qualquer utilizador autenticado pode
 * candidatar-se, mas fica sempre PENDING/inativo ate um ADMIN aprovar -
 * isto e o "so quem tem permissao controla profissionais" pedido.
 */
export async function createProfessional(ownerId: string, input: CreateProfessionalInput) {
  const existing = await prisma.professional.findUnique({ where: { ownerId } });
  if (existing) {
    throw new ConflictError("Ja tem um perfil de profissional criado");
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw new NotFoundError("Categoria indicada nao existe");
  }

  return prisma.professional.create({
    data: {
      ...input,
      ownerId,
      status: "PENDING",
      active: false,
      verified: false,
    },
    include: publicListInclude,
  });
}

async function assertCanManageOwnProfessional(id: string, requester: Requester) {
  const professional = await prisma.professional.findUnique({ where: { id } });
  if (!professional) {
    throw new NotFoundError("Profissional nao encontrado");
  }
  if (professional.ownerId !== requester.sub && requester.role !== "ADMIN") {
    throw new ForbiddenError("So o dono do perfil ou um administrador pode alterar este recurso");
  }
  return professional;
}

export async function updateOwnProfessional(
  id: string,
  requester: Requester,
  input: UpdateOwnProfessionalInput
) {
  await assertCanManageOwnProfessional(id, requester);

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw new NotFoundError("Categoria indicada nao existe");
    }
  }

  return prisma.professional.update({ where: { id }, data: input, include: publicListInclude });
}

export async function deleteProfessional(id: string, requester: Requester) {
  await assertCanManageOwnProfessional(id, requester);
  await prisma.professional.delete({ where: { id } });
}

/**
 * Unico ponto que transiciona o estado de aprovacao. So chamado por
 * rotas protegidas com `authorize("ADMIN")`.
 */
export async function updateProfessionalStatus(
  id: string,
  adminId: string,
  input: UpdateStatusInput
) {
  const professional = await prisma.professional.findUnique({ where: { id } });
  if (!professional) {
    throw new NotFoundError("Profissional nao encontrado");
  }

  return prisma.professional.update({
    where: { id },
    data: {
      status: input.status,
      active: input.status === "APPROVED",
      rejectionReason: input.status === "REJECTED" ? input.rejectionReason ?? null : null,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
    include: publicListInclude,
  });
}

export async function setProfessionalVerified(id: string, verified: boolean) {
  const professional = await prisma.professional.findUnique({ where: { id } });
  if (!professional) {
    throw new NotFoundError("Profissional nao encontrado");
  }
  return prisma.professional.update({ where: { id }, data: { verified }, include: publicListInclude });
}

/**
 * Recalcula a media de avaliacoes e o total a partir da tabela Review.
 * Chamado sempre que uma review e criada/apagada, para que `rating` e
 * `reviewsCount` nunca fiquem dessincronizados dos dados reais.
 */
export async function recalculateProfessionalRating(professionalId: string) {
  const aggregate = await prisma.review.aggregate({
    where: { professionalId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.professional.update({
    where: { id: professionalId },
    data: {
      rating: aggregate._avg.rating ?? 5,
      reviewsCount: aggregate._count,
    },
  });
}
