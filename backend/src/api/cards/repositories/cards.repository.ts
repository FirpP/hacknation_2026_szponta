import prisma from "@/prisma-client";
import type { Prisma } from "../../../../prisma/generated/client";
import type { CardWithRecord, ICardsRepository, SimilarityRow } from "@api/cards/types/cards.types";
import type { CardsQuery } from "@api/cards/validators/cards.validator";

const RECORD_SELECT = { select: { source: true, firstSeenAt: true, fetchedAt: true } } as const;

const buildWhere = (query: CardsQuery): Prisma.InnovationCardWhereInput => ({
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
});

const orderBy = (query: CardsQuery): Prisma.InnovationCardOrderByWithRelationInput[] => [
  { [query.sort]: query.order },
  { id: "desc" },
];

export class CardsRepository implements ICardsRepository {
  async findPage(query: CardsQuery): Promise<{ rows: CardWithRecord[]; total: number }> {
    const where = buildWhere(query);
    const [rows, total] = await prisma.$transaction([
      prisma.innovationCard.findMany({
        where,
        include: { rawRecord: RECORD_SELECT },
        orderBy: orderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.innovationCard.count({ where }),
    ]);
    return { rows, total };
  }

  async findAll(query: CardsQuery): Promise<CardWithRecord[]> {
    return prisma.innovationCard.findMany({
      where: buildWhere(query),
      include: { rawRecord: RECORD_SELECT },
      orderBy: orderBy(query),
    });
  }

  async findSimilarityRows(): Promise<SimilarityRow[]> {
    return prisma.innovationCard.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        applicationArea: true,
        domain: true,
        implementationStatus: true,
        sourceName: true,
        analyzedAt: true,
      },
    });
  }

  async findById(id: number): Promise<CardWithRecord | null> {
    return prisma.innovationCard.findUnique({ where: { id }, include: { rawRecord: RECORD_SELECT } });
  }
}
