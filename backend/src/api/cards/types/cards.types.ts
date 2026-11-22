import type { InnovationCard } from "../../../../prisma/generated/client";
import type { CardDetail, CardsPage, CardsQuery, SimilarCardDto } from "@api/cards/validators/cards.validator";

export type CardWithRecord = InnovationCard & {
  rawRecord: { source: string; firstSeenAt: Date; fetchedAt: Date };
};

export type SimilarityRow = Pick<
  InnovationCard,
  "id" | "title" | "description" | "applicationArea" | "domain" | "implementationStatus" | "sourceName" | "analyzedAt"
>;

export interface ICardsRepository {
  findPage(query: CardsQuery): Promise<{ rows: CardWithRecord[]; total: number }>;
  /** Wszystkie karty spełniające filtry SQL, w kolejności sortowania (do filtrów liczonych w JS) */
  findAll(query: CardsQuery): Promise<CardWithRecord[]>;
  findById(id: number): Promise<CardWithRecord | null>;
  findSimilarityRows(): Promise<SimilarityRow[]>;
}

export interface ICardsService {
  listCards(query: CardsQuery): Promise<CardsPage>;
  getCard(id: number): Promise<CardDetail>;
  getSimilarCards(id: number): Promise<SimilarCardDto[]>;
}
