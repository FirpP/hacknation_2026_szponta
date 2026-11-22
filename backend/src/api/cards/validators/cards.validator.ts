import { z } from "zod";
import { DOMAINS, FIELD_BASIS, IMPLEMENTATION_STATUSES } from "@/analysis/card.schema";

// ---------- wejście ----------

export const CardsQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(200).optional().describe("Fraza w tytule, opisie lub obszarze zastosowania"),
    domain: z.enum(DOMAINS).optional(),
    status: z.enum(IMPLEMENTATION_STATUSES).optional().describe("Poziom wdrożenia"),
    source: z.string().trim().min(1).max(50).optional().describe("Identyfikator źródła, np. ncbr"),
    trlMin: z.coerce.number().int().min(1).max(9).optional(),
    trlMax: z.coerce.number().int().min(1).max(9).optional(),
    isInnovation: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional()
      .describe("Czy rekord jest innowacją wg Oslo Manual (szacunek modelu)"),
    sort: z
      .enum(["analyzedAt", "innovationScore", "applicationPotentialScore", "credibilityScore", "trl"])
      .default("analyzedAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((q) => q.trlMin === undefined || q.trlMax === undefined || q.trlMin <= q.trlMax, {
    message: "trlMin nie może być większe niż trlMax",
    path: ["trlMin"],
  });
export type CardsQuery = z.infer<typeof CardsQuerySchema>;

export const CardIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export const RunsQuerySchema = z.object({
  source: z.string().trim().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RunsQuery = z.infer<typeof RunsQuerySchema>;

// ---------- wyjście ----------

const ScoreSchema = z.object({ score: z.number().int().min(1).max(5), rationale: z.string() });

export const EvidenceSchema = z
  .object({
    field: z.string(),
    quote: z.string(),
    verified: z.boolean().describe("Czy cytat występuje w surowym rekordzie (sprawdzane automatycznie)"),
  })
  .meta({ ref: "Evidence" });

export const CardSummarySchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    description: z.string(),
    applicationArea: z.string().nullable(),
    domain: z.enum(DOMAINS),
    isInnovation: z.boolean().nullable(),
    implementationStatus: z.enum(IMPLEMENTATION_STATUSES),
    trl: z.number().int().nullable(),
    scores: z.object({ innovation: ScoreSchema, applicationPotential: ScoreSchema, credibility: ScoreSchema }),
    fieldBasis: z.record(z.string(), z.enum(FIELD_BASIS)).describe("CONFIRMED = wprost w źródle, ESTIMATED = szacunek"),
    source: z.object({ id: z.string(), name: z.string(), url: z.string() }),
    analyzedAt: z.iso.datetime(),
  })
  .meta({ ref: "CardSummary", description: "Karta innowacji (lista)" });
export type CardSummary = z.infer<typeof CardSummarySchema>;

export const CardDetailSchema = CardSummarySchema.extend({
  isInnovationRationale: z.string().nullable(),
  evidence: z.array(EvidenceSchema),
  source: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    firstSeenAt: z.iso.datetime(),
    fetchedAt: z.iso.datetime(),
  }),
  analysis: z.object({ model: z.string(), promptVersion: z.string() }),
}).meta({ ref: "CardDetail", description: "Pełna karta innowacji ze źródłami i cytatami" });
export type CardDetail = z.infer<typeof CardDetailSchema>;

export const CardsPageSchema = z
  .object({
    items: z.array(CardSummarySchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ ref: "CardsPage" });
export type CardsPage = z.infer<typeof CardsPageSchema>;

export const ScrapeRunSchema = z
  .object({
    id: z.number().int(),
    source: z.string(),
    status: z.enum(["RUNNING", "SUCCESS", "PARTIAL", "FAILED", "SKIPPED"]),
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime().nullable(),
    itemsFetched: z.number().int(),
    itemsNew: z.number().int(),
    itemsChanged: z.number().int(),
    error: z.string().nullable(),
  })
  .meta({ ref: "ScrapeRun", description: "Uruchomienie scrapera" });
export type ScrapeRunDto = z.infer<typeof ScrapeRunSchema>;

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
