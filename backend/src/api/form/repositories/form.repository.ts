import prisma from "@/prisma-client";
import type { IFormRepository } from "@api/form/types/form.types";

export class FormRepository implements IFormRepository {
  async countyExists(id: number): Promise<boolean> {
    const county = await prisma.county.findUnique({ where: { id }, select: { id: true } });
    return county !== null;
  }
}
