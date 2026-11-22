import { DOMAINS, IMPLEMENTATION_STATUSES } from "@/analysis/card.schema";
import type { IStatsRepository, IStatsService } from "@api/stats/types/stats.types";
import type { StatsDto } from "@api/stats/validators/stats.validator";

type EvidenceItem = { verified: boolean };

const zeroCounts = <T extends string>(values: readonly T[]) =>
  Object.fromEntries(values.map((v) => [v, 0])) as Record<T, number>;

export class StatsService implements IStatsService {
  constructor(private readonly repository: IStatsRepository) {}

  async getStats(): Promise<StatsDto> {
    const { rows, lastFetchedAt } = await this.repository.findStatsRows();
    const byDomain = zeroCounts(DOMAINS);
    const byStatus = zeroCounts(IMPLEMENTATION_STATUSES);
    const sources = new Map<string, { id: string; name: string; cards: number }>();
    const evidence = { total: 0, verified: 0 };
    let innovations = 0;

    for (const row of rows) {
      byDomain[row.domain]++;
      byStatus[row.implementationStatus]++;
      if (row.isInnovation) innovations++;
      const id = row.rawRecord.source;
      const entry = sources.get(id) ?? { id, name: row.sourceName, cards: 0 };
      entry.cards++;
      sources.set(id, entry);
      for (const item of Array.isArray(row.evidence) ? (row.evidence as EvidenceItem[]) : []) {
        evidence.total++;
        if (item.verified) evidence.verified++;
      }
    }

    return {
      totalCards: rows.length,
      innovations,
      byDomain,
      byStatus,
      sources: [...sources.values()].sort((a, b) => b.cards - a.cards),
      evidence,
      lastFetchedAt: lastFetchedAt?.toISOString() ?? null,
    };
  }
}
