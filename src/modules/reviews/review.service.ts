import { prisma } from "../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { recalculateProfessionalRating } from "../professionals/professional.service";
import type { CreateReviewInput } from "./review.schema";
import type { Role } from "@prisma/client";

export function listReviewsByProfessional(professionalId: string) {
  return prisma.review.findMany({
    where: { professionalId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function createReview(
  professionalId: string,
  authorId: string,
  input: CreateReviewInput
) {
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || professional.status !== "APPROVED" || !professional.active) {
    throw new NotFoundError("Profissional nao encontrado");
  }

  if (professional.ownerId === authorId) {
    throw new BadRequestError("Nao pode avaliar o seu proprio perfil");
  }

  const existing = await prisma.review.findUnique({
    where: { one_review_per_client: { professionalId, authorId } },
  });
  if (existing) {
    throw new BadRequestError("Ja avaliou este profissional anteriormente");
  }

  const review = await prisma.review.create({
    data: { professionalId, authorId, rating: input.rating, comment: input.comment },
  });

  await recalculateProfessionalRating(professionalId);

  return review;
}

export async function deleteReview(id: string, requester: { sub: string; role: Role }) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new NotFoundError("Avaliacao nao encontrada");
  }
  if (review.authorId !== requester.sub && requester.role !== "ADMIN") {
    throw new ForbiddenError("So o autor ou um administrador pode remover esta avaliacao");
  }

  await prisma.review.delete({ where: { id } });
  await recalculateProfessionalRating(review.professionalId);
}
