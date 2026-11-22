import { z } from "zod";
import { DOMAINS, IMPLEMENTATION_STATUSES } from "@/analysis/card.schema";

const countsOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.object(Object.fromEntries(values.map((v) => [v, z.number().int()])) as Record<T[number], z.ZodNumber>);

export const StatsSchema = z
  .object({
    totalCards: z.number().int(),
    innovations: z.number().int().describe("Karty z isInnovation = true (szacunek modelu)"),
    byDomain: countsOf(DOMAINS),
    byStatus: countsOf(IMPLEMENTATION_STATUSES),
    sources: z.array(z.object({ id: z.string(), name: z.string(), cards: z.number().int() })),
    evidence: z.object({ total: z.number().int(), verified: z.number().int() }),
    lastFetchedAt: z.iso.datetime().nullable().describe("Ostatnie pobranie rekordu ze źródła"),
  })
  .meta({ ref: "Stats", description: "Podsumowanie bazy kart" });
export type StatsDto = z.infer<typeof StatsSchema>;
