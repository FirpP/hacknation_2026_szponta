import { describeRoute, resolver } from "hono-openapi";
import { EmployeeSchema } from "@api/auth/validators/auth.validator";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";

// GET /api/v1/panel
export const getPanelDocs = describeRoute({
  tags: ["Panel"],
  summary: "Panel pracownika (dane zalogowanego pracownika)",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Dane zalogowanego pracownika",
      content: { "application/json": { schema: resolver(EmployeeSchema) } },
    },
    401: {
      description: "Brak lub niepoprawna sesja",
      content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
    },
    500: {
      description: "Nieoczekiwany błąd serwera",
      content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
    },
  },
});
