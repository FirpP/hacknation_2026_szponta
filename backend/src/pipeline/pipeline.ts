/**
 * pipeline = scrape:all + analyze. Jeden lock na całość, więc cron i ręczne uruchomienia się nie nakładają.
 * Bez konfiguracji LLM analiza jest pomijana z ostrzeżeniem (scraping nadal działa).
 * Użycie: bun src/pipeline/pipeline.ts [--limit N] [--offline] [--source ncbr]
 */
import { analyzePending } from "@/analysis/analyze";
import { isLlmConfigured } from "@/analysis/llm-client";
import { parseCliFlags, runExclusiveCli, type CliFlags } from "@/scrapers/_shared/cli";
import { scrapeAll } from "./scrape-all";

export const runPipeline = async (flags: CliFlags = {}): Promise<boolean> => {
  const started = Date.now();
  console.log(`=== Pipeline Radaru Innowacji: ${new Date().toISOString()} ===`);
  const summaries = await scrapeAll({ limit: flags.limit, offline: flags.offline, source: flags.source });

  let analysisOk = true;
  if (isLlmConfigured()) {
    const analysis = await analyzePending({ source: flags.source });
    analysisOk = analysis.failed === 0 || analysis.done > 0;
  } else {
    console.warn("⚠ Pominięto analizę: brak LLM_BASE_URL / LLM_API_KEY / LLM_MODEL w .env");
  }

  console.log(`=== Pipeline zakończony w ${((Date.now() - started) / 1000).toFixed(1)} s ===`);
  return summaries.some((s) => s.status !== "FAILED") && analysisOk;
};

if (import.meta.main) {
  await runExclusiveCli("pipeline", () => runPipeline(parseCliFlags()));
}
