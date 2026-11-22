import { describe, expect, it, mock } from "bun:test";
import { CardsService } from "@api/cards/services/cards.service";
import type { CardWithRecord, ICardsRepository } from "@api/cards/types/cards.types";
import { CardsQuerySchema } from "@api/cards/validators/cards.validator";
import { NotFoundError } from "@lib/errors/app-errors";

const repository = (): ICardsRepository => ({
  findPage: mock(async () => ({ rows: [], total: 0 })),
  findAll: mock(async () => []),
  findSimilarityRows: mock(async () => []),
  findById: mock(async () => null),
});

const card = (id: number, over: Partial<CardWithRecord> = {}): CardWithRecord =>
  ({
    id,
    rawRecordId: id,
    rawContentHash: "h",
    title: `Karta ${id}`,
    description: "Opis karty.",
    applicationArea: null,
    domain: "TECHNOLOGICAL",
    isInnovation: true,
    isInnovationRationale: null,
    sourceUrl: "https://example.org",
    sourceName: "NCBR",
    implementationStatus: "PROTOTYPE",
    trl: null,
    innovationScore: 3,
    innovationRationale: "a",
    applicationPotentialScore: 3,
    applicationPotentialRationale: "b",
    credibilityScore: 3,
    credibilityRationale: "c",
    evidence: [],
    fieldBasis: {},
    analyzedAt: new Date("2026-11-22T00:00:00.000Z"),
    model: "m",
    promptVersion: "card-v2",
    rawRecord: { source: "ncbr", firstSeenAt: new Date(), fetchedAt: new Date() },
    ...over,
  }) as CardWithRecord;

describe("CardsService.listCards z filtrami rekomendacji", () => {
  const rows = [
    card(1, { implementationStatus: "IN_USE", innovationScore: 4 }), // komercjalizacja
    card(2, { domain: "EDUCATIONAL", implementationStatus: "IN_USE" }), // transfer
    card(3), // pilotaż
    card(4, { domain: "EDUCATIONAL", implementationStatus: "IN_USE", trl: 9 }), // transfer
  ];
  const repo = (): ICardsRepository => ({ ...repository(), findAll: mock(async () => rows) });
  const base = CardsQuerySchema.parse({});

  it("bez filtrów rekomendacji używa stronicowania w SQL", async () => {
    const r = repo();
    await new CardsService(r).listCards(base);
    expect(r.findPage).toHaveBeenCalled();
    expect(r.findAll).not.toHaveBeenCalled();
  });

  it("filtruje po ścieżce i stronicuje w JS", async () => {
    const result = await new CardsService(repo()).listCards({ ...base, path: "TRANSFER", pageSize: 1, page: 2 });
    expect(result.total).toBe(2);
    expect(result.items.map((c) => c.id)).toEqual([4]);
  });

  it("filtruje po grupie odbiorców", async () => {
    const result = await new CardsService(repo()).listCards({ ...base, audience: "INVESTORS" });
    expect(result.items.map((c) => c.id)).toEqual([1]);
  });
});

describe("CardsService.getSimilarCards", () => {
  const rows = [
    card(1, { title: "Światłowodowy czujnik odkształceń mostów", description: "Czujnik światłowodowy do mostów." }),
    card(2, {
      title: "Światłowodowy czujnik odkształceń konstrukcji",
      description: "Czujnik światłowodowy do mostów.",
    }),
    card(3, { title: "Szkoła bez barier", description: "Dostępność budynków szkolnych." }),
  ];
  const service = () => new CardsService({ ...repository(), findSimilarityRows: mock(async () => rows) });

  it("zwraca podobne karty z oceną i flagą duplikatu", async () => {
    const [top] = await service().getSimilarCards(1);
    expect(top!.id).toBe(2);
    expect(top!.possibleDuplicate).toBe(true);
    expect(top!.score).toBeGreaterThan(0.7);
  });

  it("404 dla nieistniejącej karty", async () => {
    await expect(service().getSimilarCards(99)).rejects.toBeInstanceOf(NotFoundError);
  });
});
