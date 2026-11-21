import { describeRoute, resolver } from "hono-openapi";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
});

// POST /api/v1/auth/login
export const loginDocs = describeRoute({
  tags: ["Auth"],
  summary: "Logowanie pracownika (ustawia cookie sesji)",
  responses: {
    204: {
      description: "Zalogowano, w odpowiedzi ustawione cookie HttpOnly z JWT",
    },
    401: error("Niepoprawny login lub hasło"),
    422: error("Niepoprawne dane wejściowe"),
    429: error("Zbyt wiele prób logowania"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// POST /api/v1/auth/logout
export const logoutDocs = describeRoute({
  tags: ["Auth"],
  summary: "Wylogowanie (usuwa cookie sesji)",
  responses: {
    204: { description: "Wylogowano, cookie sesji usunięte" },
    500: error("Nieoczekiwany błąd serwera"),
  },
});
