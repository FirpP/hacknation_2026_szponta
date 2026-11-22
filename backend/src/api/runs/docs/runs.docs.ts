import { z } from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";
import { ScrapeRunSchema } from "@api/runs/validators/runs.validator";

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
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
