import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { UserSchema } from "@api/users/validators/users.validator";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
});

// GET /api/v1/users
export const getUsersDocs = describeRoute({
  tags: ["Users"],
  summary: "Lista użytkowników",
  responses: {
    200: {
      description: "Lista wszystkich użytkowników",
      content: { "application/json": { schema: resolver(z.array(UserSchema)) } }, // tablica obiektów User
    },
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// GET /api/v1/users/:id
export const getUserByIdDocs = describeRoute({
  tags: ["Users"],
  summary: "Pobierz użytkownika po ID",
  // Parametr :id opisuje middleware validate("param", GetUserIdParamsSchema) w users.routes.ts
  responses: {
    200: {
      description: "Szczegóły użytkownika",
      content: { "application/json": { schema: resolver(UserSchema) } }, // obiekt User
    },
    404: error("Użytkownik nie został znaleziony"),
    422: error("Niepoprawne ID (nie jest UUID)"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// POST /api/v1/users
export const createUserDocs = describeRoute({
  tags: ["Users"],
  summary: "Dodaj użytkownika (wymaga zalogowania)",
  // Body opisuje middleware validate("json", CreateUserBodySchema) w users.routes.ts
  security: [{ cookieAuth: [] }],
  responses: {
    201: {
      description: "Utworzony użytkownik",
      content: { "application/json": { schema: resolver(UserSchema) } },
    },
    401: error("Brak lub niepoprawna sesja"),
    409: error("Nazwa lub email są już zajęte"),
    422: error("Niepoprawne dane wejściowe"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// DELETE /api/v1/users/:id
export const deleteUserDocs = describeRoute({
  tags: ["Users"],
  summary: "Usuń użytkownika (wymaga zalogowania)",
  security: [{ cookieAuth: [] }],
  responses: {
    204: { description: "Użytkownik usunięty" },
    401: error("Brak lub niepoprawna sesja"),
    404: error("Użytkownik nie został znaleziony"),
    422: error("Niepoprawne ID (nie jest UUID)"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});
