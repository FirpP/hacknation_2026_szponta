import { NotFoundError } from "@lib/errors/app-errors";
import type { CardWithRecord, ICardsRepository, ICardsService } from "@api/cards/types/cards.types";
import type {
  CardDetail,
  CardsPage,
  CardsQuery,
  CardSummary,
  RunsQuery,
  ScrapeRunDto,
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
});

export class CardsService implements ICardsService {
  constructor(private readonly repository: ICardsRepository) {}

  async listCards(query: CardsQuery): Promise<CardsPage> {
    const { rows, total } = await this.repository.findPage(query);
    return { items: rows.map(toSummary), total, page: query.page, pageSize: query.pageSize };
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

  async listRuns(query: RunsQuery): Promise<ScrapeRunDto[]> {
    const runs = await this.repository.findRuns(query);
    return runs.map((r) => ({
      id: r.id,
      source: r.source,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      itemsFetched: r.itemsFetched,
      itemsNew: r.itemsNew,
      itemsChanged: r.itemsChanged,
      error: r.error,
    }));
  }
}
