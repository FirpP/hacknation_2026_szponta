import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";
import { CardDetailSchema, CardsPageSchema, ScrapeRunSchema, StatsSchema } from "@api/cards/validators/cards.validator";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
});

// GET /api/v1/cards
export const listCardsDocs = describeRoute({
  tags: ["Radar"],
  summary: "Lista kart innowacji z filtrami (tylko odczyt)",
  responses: {
    200: { description: "Strona kart", content: { "application/json": { schema: resolver(CardsPageSchema) } } },
    422: error("Niepoprawne parametry filtrowania"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// GET /api/v1/cards/:id
export const getCardDocs = describeRoute({
  tags: ["Radar"],
  summary: "Pełna karta innowacji: cytaty, pochodzenie pól, źródło",
  responses: {
    200: { description: "Karta", content: { "application/json": { schema: resolver(CardDetailSchema) } } },
    404: error("Brak karty"),
    422: error("Niepoprawne id"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// GET /api/v1/runs
export const listRunsDocs = describeRoute({
  tags: ["Radar"],
  summary: "Ostatnie uruchomienia scraperów (świeżość bazy)",
  responses: {
    200: {
      description: "Lista runów, od najnowszego",
      content: { "application/json": { schema: resolver(z.array(ScrapeRunSchema)) } },
    },
    422: error("Niepoprawne parametry"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// GET /api/v1/stats
export const getStatsDocs = describeRoute({
  tags: ["Radar"],
  summary: "Podsumowanie bazy: liczby kart wg obszaru, statusu i źródła, odsetek zweryfikowanych cytatów",
  responses: {
    200: { description: "Statystyki", content: { "application/json": { schema: resolver(StatsSchema) } } },
    500: error("Nieoczekiwany błąd serwera"),
  },
});
