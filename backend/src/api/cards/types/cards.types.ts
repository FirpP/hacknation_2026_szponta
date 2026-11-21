import type { InnovationCard, ScrapeRun } from "../../../../prisma/generated/client";
import type { CardDetail, CardsPage, CardsQuery, RunsQuery, ScrapeRunDto } from "@api/cards/validators/cards.validator";

export type CardWithRecord = InnovationCard & {
  rawRecord: { source: string; firstSeenAt: Date; fetchedAt: Date };
};

export interface ICardsRepository {
  findPage(query: CardsQuery): Promise<{ rows: CardWithRecord[]; total: number }>;
  findById(id: number): Promise<CardWithRecord | null>;
  findRuns(query: RunsQuery): Promise<ScrapeRun[]>;
}

export interface ICardsService {
  listCards(query: CardsQuery): Promise<CardsPage>;
  getCard(id: number): Promise<CardDetail>;
  listRuns(query: RunsQuery): Promise<ScrapeRunDto[]>;
}
