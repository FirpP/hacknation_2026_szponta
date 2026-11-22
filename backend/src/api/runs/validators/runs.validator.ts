import { z } from "zod";

// ---------- wejście ----------

export const RunsQuerySchema = z.object({
  source: z.string().trim().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RunsQuery = z.infer<typeof RunsQuerySchema>;

// ---------- wyjście ----------

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
