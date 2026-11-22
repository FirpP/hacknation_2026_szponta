import prisma from "@/prisma-client";
import type { CardStatsRow, IStatsRepository } from "@api/stats/types/stats.types";

export class StatsRepository implements IStatsRepository {
  // Setki kart w demo: agregujemy w JS (liczenie cytatów wymaga odczytu JSON evidence)
  async findStatsRows(): Promise<{ rows: CardStatsRow[]; lastFetchedAt: Date | null }> {
    const [rows, latest] = await prisma.$transaction([
      prisma.innovationCard.findMany({
        select: {
          domain: true,
          implementationStatus: true,
          isInnovation: true,
          sourceName: true,
          evidence: true,
          rawRecord: { select: { source: true } },
        },
      }),
      prisma.rawRecord.aggregate({ _max: { fetchedAt: true } }),
    ]);
    return { rows, lastFetchedAt: latest._max.fetchedAt };
  }
}
