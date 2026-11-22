import type { InnovationCard, ScrapeRun } from "../../../../prisma/generated/client";
import type {
  CardDetail,
  CardsPage,
  CardsQuery,
  RunsQuery,
  ScrapeRunDto,
  StatsDto,
} from "@api/cards/validators/cards.validator";

export type CardWithRecord = InnovationCard & {
  rawRecord: { source: string; firstSeenAt: Date; fetchedAt: Date };
};

export type CardStatsRow = Pick<
  InnovationCard,
  "domain" | "implementationStatus" | "isInnovation" | "sourceName" | "evidence"
> & { rawRecord: { source: string } };

export interface ICardsRepository {
  findPage(query: CardsQuery): Promise<{ rows: CardWithRecord[]; total: number }>;
  findById(id: number): Promise<CardWithRecord | null>;
  findRuns(query: RunsQuery): Promise<ScrapeRun[]>;
  findStatsRows(): Promise<{ rows: CardStatsRow[]; lastFetchedAt: Date | null }>;
}

export interface ICardsService {
  listCards(query: CardsQuery): Promise<CardsPage>;
  getCard(id: number): Promise<CardDetail>;
  listRuns(query: RunsQuery): Promise<ScrapeRunDto[]>;
  getStats(): Promise<StatsDto>;
}
