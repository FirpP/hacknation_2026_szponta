import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";
import { CardDetailSchema, CardsPageSchema, SimilarCardSchema } from "@api/cards/validators/cards.validator";

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

// GET /api/v1/cards/:id/similar
export const getSimilarCardsDocs = describeRoute({
  tags: ["Radar"],
  summary: "Podobne karty i możliwe duplikaty (TF-IDF, bez AI)",
  responses: {
    200: {
      description: "Do 5 najbardziej podobnych kart, duplikaty na początku",
      content: { "application/json": { schema: resolver(z.array(SimilarCardSchema)) } },
    },
    404: error("Brak karty"),
    422: error("Niepoprawne id"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});
