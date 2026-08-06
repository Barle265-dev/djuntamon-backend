import { prisma } from "../../config/prisma";

export async function getDashboardStats() {
  const [categoriesTotal, categoriesActive, professionalsTotal, professionalsActive, verified, pending] =
    await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { active: true } }),
      prisma.professional.count(),
      prisma.professional.count({ where: { active: true } }),
      prisma.professional.count({ where: { verified: true } }),
      prisma.professional.count({ where: { status: "PENDING" } }),
    ]);

  return {
    categories: { total: categoriesTotal, active: categoriesActive },
    professionals: {
      total: professionalsTotal,
      active: professionalsActive,
      verified,
      pendingApproval: pending,
    },
  };
}
