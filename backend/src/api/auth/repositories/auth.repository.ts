import prisma from "@/prisma-client";
import type { Employee, EmployeeWithHash, IAuthRepository } from "@api/auth/types/auth.types";

export class AuthRepository implements IAuthRepository {
  async findByUsername(username: string): Promise<EmployeeWithHash | null> {
    return prisma.employee.findUnique({
      where: { username },
      select: { id: true, username: true, passwordHash: true },
    });
  }

  async findById(id: string): Promise<Employee | null> {
    return prisma.employee.findUnique({
      where: { id },
      select: { id: true, username: true },
    });
  }
}
