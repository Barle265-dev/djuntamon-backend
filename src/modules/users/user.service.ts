import { prisma } from "../../config/prisma";
import type { Role } from "@prisma/client";

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role?: Role;
}) {
  return prisma.user.create({ data });
}
