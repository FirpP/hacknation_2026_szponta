/**
 * scrape:all: uruchamia wszystkie źródła po kolei. Awaria jednego źródła nie przerywa pozostałych.
 * Użycie: bun src/pipeline/scrape-all.ts [--limit N] [--offline] [--source ncbr]
 */
import { parseCliFlags, runExclusiveCli } from "@/scrapers/_shared/cli";
import { executeScrape, type ScrapeSummary } from "@/scrapers/_shared/runner";
import { SOURCES } from "@/scrapers";

export const scrapeAll = async (opts: { limit?: number; offline?: boolean; source?: string } = {}) => {
  const selected = opts.source ? SOURCES.filter((s) => s.id === opts.source) : SOURCES;
  if (selected.length === 0)
    throw new Error(`Nieznane źródło "${opts.source}". Dostępne: ${SOURCES.map((s) => s.id).join(", ")}`);

  const summaries: ScrapeSummary[] = [];
  for (const source of selected) {
    summaries.push(await executeScrape(source, { limit: opts.limit, offline: opts.offline }));
  }
  console.log("\nPodsumowanie scrape:all");
  console.table(
    summaries.map((s) => ({
      source: s.source,
      status: s.status,
      fetched: s.itemsFetched,
      new: s.itemsNew,
      changed: s.itemsChanged,
      "czas [s]": (s.durationMs / 1000).toFixed(1),
      info: s.error?.slice(0, 90) ?? "",
    })),
  );
  return summaries;
};

if (import.meta.main) {
  await runExclusiveCli("scrape:all", async () => {
    const flags = parseCliFlags();
    const summaries = await scrapeAll(flags);
    // Błąd tylko, gdy wszystkie uruchomione źródła padły (SKIPPED to świadoma decyzja, nie błąd)
    return summaries.some((s) => s.status !== "FAILED");
  });
}
