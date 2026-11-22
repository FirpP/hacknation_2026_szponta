import type { InnovationCard } from "../../../../prisma/generated/client";
import type { StatsDto } from "@api/stats/validators/stats.validator";

export type CardStatsRow = Pick<
  InnovationCard,
  "domain" | "implementationStatus" | "isInnovation" | "sourceName" | "evidence"
> & { rawRecord: { source: string } };

export interface IStatsRepository {
  findStatsRows(): Promise<{ rows: CardStatsRow[]; lastFetchedAt: Date | null }>;
}

export interface IStatsService {
  getStats(): Promise<StatsDto>;
}
