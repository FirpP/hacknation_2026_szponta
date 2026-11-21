import prisma from "@/prisma-client";
import type { IUsersRepository, User } from "@api/users/types/users.types";
import type { CreateUserBody } from "@api/users/validators/users.validator";

// Pola zwracane na zewnątrz - jedno miejsce zamiast powtarzania select w każdej metodzie
const userSelect = { id: true, name: true, email: true } as const;

export class UsersRepository implements IUsersRepository {
  async getAll(): Promise<User[]> {
    return prisma.user.findMany({ select: userSelect, orderBy: { createdAt: "asc" } });
  }

  async getById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  // Duplikat name/email rzuca Prisma P2002, a errorHandler zamienia go na 409 CONFLICT
  async create(data: CreateUserBody): Promise<User> {
    return prisma.user.create({ data, select: userSelect });
  }

  // deleteMany zamiast delete: brak rekordu to count 0, a nie wyjątek - serwis decyduje o 404
  async deleteById(id: string): Promise<boolean> {
    const { count } = await prisma.user.deleteMany({ where: { id } });
    return count > 0;
  }
}
