import { describeRoute, resolver } from "hono-openapi";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
});

// POST /api/v1/form/submit/1
export const submitStep1Docs = describeRoute({
  tags: ["Form"],
  summary: "Walidacja kroku 1 formularza: kto zgłasza",
  description: "Sprawdza dane kroku i niczego nie zapisuje. Odpowiedź 200 oznacza, że można przejść do kroku 2.",
  // Body opisuje middleware validate("json", Step1BodySchema) w form.routes.ts
  responses: {
    204: {
      description: "Dane kroku są poprawne",
    },
    422: error("Niepoprawne dane wejściowe (w details pola z błędami)"),
    429: error("Zbyt wiele żądań"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});
