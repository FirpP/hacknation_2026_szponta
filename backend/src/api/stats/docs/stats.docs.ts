import { describeRoute, resolver } from "hono-openapi";
import { ErrorResponseSchema } from "@lib/errors/error-response.schema";
import { StatsSchema } from "@api/stats/validators/stats.validator";

// GET /api/v1/stats
export const getStatsDocs = describeRoute({
  tags: ["Radar"],
  summary: "Podsumowanie bazy: liczby kart wg obszaru, statusu i źródła, odsetek zweryfikowanych cytatów",
  responses: {
    200: { description: "Statystyki", content: { "application/json": { schema: resolver(StatsSchema) } } },
    500: {
      description: "Nieoczekiwany błąd serwera",
      content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
    },
  },
});
