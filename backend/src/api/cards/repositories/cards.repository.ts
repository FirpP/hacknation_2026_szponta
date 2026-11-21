import prisma from "@/prisma-client";
import type { Prisma } from "../../../../prisma/generated/client";
import type { CardWithRecord, ICardsRepository } from "@api/cards/types/cards.types";
import type { CardsQuery, RunsQuery } from "@api/cards/validators/cards.validator";

const RECORD_SELECT = { select: { source: true, firstSeenAt: true, fetchedAt: true } } as const;

export class CardsRepository implements ICardsRepository {
  async findPage(query: CardsQuery): Promise<{ rows: CardWithRecord[]; total: number }> {
    const where: Prisma.InnovationCardWhereInput = {
      ...(query.domain ? { domain: query.domain } : {}),
      ...(query.status ? { implementationStatus: query.status } : {}),
      ...(query.isInnovation !== undefined ? { isInnovation: query.isInnovation } : {}),
      ...(query.source ? { rawRecord: { source: query.source } } : {}),
      ...(query.trlMin !== undefined || query.trlMax !== undefined
        ? {
            trl: {
              ...(query.trlMin !== undefined ? { gte: query.trlMin } : {}),
              ...(query.trlMax !== undefined ? { lte: query.trlMax } : {}),
            },
          }
        : {}),
      // SQLite LIKE: wielkość liter ignorowana tylko dla ASCII
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q } },
              { description: { contains: query.q } },
              { applicationArea: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.innovationCard.findMany({
        where,
        include: { rawRecord: RECORD_SELECT },
        orderBy: [{ [query.sort]: query.order }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.innovationCard.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id: number): Promise<CardWithRecord | null> {
    return prisma.innovationCard.findUnique({ where: { id }, include: { rawRecord: RECORD_SELECT } });
  }

  async findRuns(query: RunsQuery) {
    return prisma.scrapeRun.findMany({
      where: query.source ? { source: query.source } : {},
      orderBy: { id: "desc" },
      take: query.limit,
    });
  }
}
