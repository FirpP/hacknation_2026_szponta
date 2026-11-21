import { describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { CardsController } from "@api/cards/controllers/cards.controller";
import type { ICardsService } from "@api/cards/types/cards.types";
import {
  CardIdParamsSchema,
  CardsQuerySchema,
  type CardDetail,
  type CardsPage,
} from "@api/cards/validators/cards.validator";
import { NotFoundError } from "@lib/errors/app-errors";
import { errorHandler } from "@middleware/error-handler";
import { validate } from "@middleware/validate";

const detail: CardDetail = {
  id: 1,
  title: "Czujnik",
  description: "Opis.",
  applicationArea: null,
  domain: "TECHNOLOGICAL",
  isInnovation: true,
  isInnovationRationale: null,
  implementationStatus: "PROTOTYPE",
  trl: 4,
  scores: {
    innovation: { score: 4, rationale: "a" },
    applicationPotential: { score: 3, rationale: "b" },
    credibility: { score: 3, rationale: "c" },
  },
  fieldBasis: { title: "CONFIRMED", trl: "ESTIMATED" },
  evidence: [{ field: "title", quote: "Czujnik", verified: true }],
  source: {
    id: "ncbr",
    name: "NCBR",
    url: "https://www.gov.pl/web/ncbr/x",
    firstSeenAt: "2026-11-21T00:00:00.000Z",
    fetchedAt: "2026-11-21T00:00:00.000Z",
  },
  analysis: { model: "seed-demo", promptVersion: "seed-v1" },
  analyzedAt: "2026-11-21T00:00:00.000Z",
};

const page: CardsPage = { items: [], total: 0, page: 1, pageSize: 20 };

const createService = (overrides: Partial<ICardsService> = {}): ICardsService => ({
  listCards: mock(async () => page),
  getCard: mock(async () => detail),
  listRuns: mock(async () => []),
  ...overrides,
});

// Te same middleware co w cards.routes.ts, ale z mockiem serwisu
const makeApp = (service: ICardsService) => {
  const controller = new CardsController(service);
  const app = new Hono();
  app.onError(errorHandler);
  app.get("/cards", validate("query", CardsQuerySchema), (c) => controller.listCards(c, c.req.valid("query")));
  app.get("/cards/:id", validate("param", CardIdParamsSchema), (c) => controller.getCard(c, c.req.valid("param").id));
  return app;
};

describe("CardsController", () => {
  it("przekazuje sparsowane filtry z domyślnymi wartościami", async () => {
    const service = createService();

    const res = await makeApp(service).request("/cards?domain=TECHNOLOGICAL&trlMin=3&isInnovation=true&page=2");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(page);
    expect(service.listCards).toHaveBeenCalledWith({
      domain: "TECHNOLOGICAL",
      trlMin: 3,
      isInnovation: true,
      sort: "analyzedAt",
      order: "desc",
      page: 2,
      pageSize: 20,
    });
  });

  it("odrzuca niepoprawne filtry (422) bez wołania serwisu", async () => {
    const service = createService();

    const res = await makeApp(service).request("/cards?status=DONE&trlMin=7&trlMax=2");

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { details: { field: string }[] } };
    expect(body.error.details.map((d) => d.field)).toContain("status");
    expect(service.listCards).not.toHaveBeenCalled();
  });

  it("zwraca pełną kartę z cytatami", async () => {
    const res = await makeApp(createService()).request("/cards/1");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(detail);
  });

  it("404 gdy karty nie ma", async () => {
    const service = createService({
      getCard: mock(async (): Promise<CardDetail> => {
        throw new NotFoundError("Nie znaleziono karty innowacji o id 9.");
      }),
    });

    const res = await makeApp(service).request("/cards/9");

    expect(res.status).toBe(404);
  });
});
