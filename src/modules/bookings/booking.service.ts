import type { Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ForbiddenError, NotFoundError } from "../../lib/errors";
import type { CreateBookingInput, UpdateBookingStatusInput } from "./booking.schema";

export async function createBooking(
  professionalId: string,
  clientId: string,
  input: CreateBookingInput
) {
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional || professional.status !== "APPROVED" || !professional.active) {
    throw new NotFoundError("Profissional nao encontrado");
  }

  return prisma.booking.create({
    data: { professionalId, clientId, ...input },
  });
}

export function listMyBookings(clientId: string) {
  return prisma.booking.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { professional: { select: { id: true, name: true, avatar: true, categoryId: true } } },
  });
}

export async function listProfessionalBookings(
  professionalId: string,
  requester: { sub: string; role: Role }
) {
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional) {
    throw new NotFoundError("Profissional nao encontrado");
  }
  if (professional.ownerId !== requester.sub && requester.role !== "ADMIN") {
    throw new ForbiddenError("So o profissional dono do perfil ou um administrador pode ver estes agendamentos");
  }

  return prisma.booking.findMany({
    where: { professionalId },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, phone: true } } },
  });
}

export async function updateBookingStatus(
  id: string,
  requester: { sub: string; role: Role },
  input: UpdateBookingStatusInput
) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { professional: true },
  });
  if (!booking) {
    throw new NotFoundError("Agendamento nao encontrado");
  }

  const isOwnerProfessional = booking.professional.ownerId === requester.sub;
  const isClient = booking.clientId === requester.sub;
  const isAdmin = requester.role === "ADMIN";

  // O cliente so pode cancelar; confirmar/concluir e responsabilidade do
  // profissional (ou de um admin em caso de disputa).
  if (input.status === "CANCELADO") {
    if (!isOwnerProfessional && !isClient && !isAdmin) {
      throw new ForbiddenError("Sem permissao para cancelar este agendamento");
    }
  } else if (!isOwnerProfessional && !isAdmin) {
    throw new ForbiddenError("So o profissional ou um administrador pode alterar este estado");
  }

  const updated = await prisma.booking.update({ where: { id }, data: { status: input.status } });

  if (input.status === "CONCLUIDO") {
    await prisma.professional.update({
      where: { id: booking.professionalId },
      data: { jobsCount: { increment: 1 } },
    });
  }

  return updated;
}
