import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { CountySchema, VoivodeshipSchema } from "@api/counties/validators/counties.validator";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
});

// GET /api/v1/counties/voivodeships
export const getVoivodeshipsDocs = describeRoute({
  tags: ["Counties"],
  summary: "Lista województw (do pierwszego selecta)",
  responses: {
    200: {
      description: "Nazwy województw posortowane alfabetycznie",
      content: { "application/json": { schema: resolver(z.array(VoivodeshipSchema)) } },
    },
    500: error("Nieoczekiwany błąd serwera"),
  },
});

// GET /api/v1/counties?voivodeship=...
export const getCountiesDocs = describeRoute({
  tags: ["Counties"],
  summary: "Powiaty wybranego województwa (do drugiego selecta)",
  // Parametr voivodeship opisuje middleware validate("query", GetCountiesQuerySchema) w counties.routes.ts
  responses: {
    200: {
      description: "Powiaty posortowane alfabetycznie",
      content: { "application/json": { schema: resolver(z.array(CountySchema)) } },
    },
    422: error("Brak lub nieznane województwo"),
    500: error("Nieoczekiwany błąd serwera"),
  },
});
