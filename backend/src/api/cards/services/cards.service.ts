import { NotFoundError } from "@lib/errors/app-errors";
import { recommend } from "@/analysis/recommend";
import { SimilarityIndex } from "@/analysis/similarity";
import type { CardWithRecord, ICardsRepository, ICardsService, SimilarityRow } from "@api/cards/types/cards.types";
import type {
  CardDetail,
  CardsPage,
  CardsQuery,
  CardSummary,
  SimilarCardDto,
} from "@api/cards/validators/cards.validator";

type EvidenceItem = CardDetail["evidence"][number];

const toSummary = (card: CardWithRecord): CardSummary => ({
  id: card.id,
  title: card.title,
  description: card.description,
  applicationArea: card.applicationArea,
  domain: card.domain,
  isInnovation: card.isInnovation,
  implementationStatus: card.implementationStatus,
  trl: card.trl,
  scores: {
    innovation: { score: card.innovationScore, rationale: card.innovationRationale },
    applicationPotential: { score: card.applicationPotentialScore, rationale: card.applicationPotentialRationale },
    credibility: { score: card.credibilityScore, rationale: card.credibilityRationale },
  },
  fieldBasis: (card.fieldBasis ?? {}) as CardSummary["fieldBasis"],
  source: { id: card.rawRecord.source, name: card.sourceName, url: card.sourceUrl },
  analyzedAt: card.analyzedAt.toISOString(),
  recommendation: recommend(card),
});

const SIMILAR_LIMIT = 5;

/** Podpis korpusu: zmienia się, gdy dojdzie, zniknie albo zostanie ponownie przeanalizowana jakaś karta */
const corpusSignature = (rows: SimilarityRow[]) =>
  `${rows.length}:${rows.reduce((max, r) => Math.max(max, r.analyzedAt.getTime(), r.id), 0)}`;

export class CardsService implements ICardsService {
  private similarity: { signature: string; index: SimilarityIndex } | null = null;

  constructor(private readonly repository: ICardsRepository) {}

  async listCards(query: CardsQuery): Promise<CardsPage> {
    if (!query.audience && !query.path) {
      const { rows, total } = await this.repository.findPage(query);
      return { items: rows.map(toSummary), total, page: query.page, pageSize: query.pageSize };
    }
    // Rekomendacja jest liczona w JS, więc filtrujemy i stronicujemy po pobraniu (setki kart, nie miliony)
    const matching = (await this.repository.findAll(query))
      .map(toSummary)
      .filter(
        (c) =>
          (!query.path || c.recommendation.path === query.path) &&
          (!query.audience || c.recommendation.audiences.includes(query.audience)),
      );
    const start = (query.page - 1) * query.pageSize;
    return {
      items: matching.slice(start, start + query.pageSize),
      total: matching.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getSimilarCards(id: number): Promise<SimilarCardDto[]> {
    const rows = await this.repository.findSimilarityRows();
    if (!rows.some((r) => r.id === id)) throw new NotFoundError(`Nie znaleziono karty innowacji o id ${id}.`);

    const signature = corpusSignature(rows);
    if (this.similarity?.signature !== signature) this.similarity = { signature, index: new SimilarityIndex(rows) };

    const byId = new Map(rows.map((r) => [r.id, r]));
    return this.similarity.index.findSimilar(id, SIMILAR_LIMIT).map((hit) => {
      const card = byId.get(hit.id)!;
      return {
        id: card.id,
        title: card.title,
        domain: card.domain,
        implementationStatus: card.implementationStatus,
        sourceName: card.sourceName,
        score: Math.round(hit.score * 100) / 100,
        possibleDuplicate: hit.possibleDuplicate,
      };
    });
  }

  async getCard(id: number): Promise<CardDetail> {
    const card = await this.repository.findById(id);
    if (!card) throw new NotFoundError(`Nie znaleziono karty innowacji o id ${id}.`);
    const summary = toSummary(card);
    return {
      ...summary,
      isInnovationRationale: card.isInnovationRationale,
      evidence: (Array.isArray(card.evidence) ? card.evidence : []) as EvidenceItem[],
      source: {
        ...summary.source,
        firstSeenAt: card.rawRecord.firstSeenAt.toISOString(),
        fetchedAt: card.rawRecord.fetchedAt.toISOString(),
      },
      analysis: { model: card.model, promptVersion: card.promptVersion },
    };
  }
}
