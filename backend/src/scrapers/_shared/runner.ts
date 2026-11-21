import { RADAR_CONFIG, sourceLimit } from "@/radar.config";
import type { RunStatus } from "../../../prisma/generated/client";
import { finishRun, saveItems, startRun } from "./persist";
import { SkipSourceError, type ScrapeOptions, type SourceDefinition } from "./types";
import { ENV } from "@lib/constants/env";

export type ScrapeSummary = {
  source: string;
  runId: number;
  status: RunStatus;
  itemsFetched: number;
  itemsNew: number;
  itemsChanged: number;
  error: string | null;
  durationMs: number;
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Jeden run jednego źródła: ScrapeRun RUNNING -> run() -> zapis RawRecord -> SUCCESS/PARTIAL/SKIPPED/FAILED.
 * Nigdy nie rzuca (błąd trafia do ScrapeRun.error), więc scrape:all idzie dalej po awarii źródła.
 * Nie bierze locka: robi to wywołujący CLI.
 */
export const executeScrape = async (
  source: SourceDefinition,
  overrides: Partial<ScrapeOptions> = {},
): Promise<ScrapeSummary> => {
  const opts: ScrapeOptions = {
    limit: overrides.limit ?? sourceLimit(source.id),
    offline: overrides.offline ?? ENV.SCRAPE_OFFLINE,
  };
  const started = Date.now();
  const run = await startRun(source.id);
  const name = RADAR_CONFIG.sources[source.id].name;
  console.log(`▶ [${source.id}] ${name} (limit ${opts.limit}${opts.offline ? ", offline" : ""})`);

  let status: RunStatus = "SUCCESS";
  let error: string | null = null;
  let fetched = 0;
  const saved = { itemsNew: 0, itemsChanged: 0 };

  try {
    const result = await source.run(opts);
    const items = result.items.slice(0, opts.limit);
    fetched = items.length;
    const persisted = await saveItems(run.id, source.id, items);
    saved.itemsNew = persisted.itemsNew;
    saved.itemsChanged = persisted.itemsChanged;
    if (result.partialError) {
      status = "PARTIAL";
      error = result.partialError;
    }
  } catch (caught) {
    status = caught instanceof SkipSourceError ? "SKIPPED" : "FAILED";
    error = errorMessage(caught);
  }

  await finishRun(run.id, { status, itemsFetched: fetched, ...saved, error });
  const summary: ScrapeSummary = {
    source: source.id,
    runId: run.id,
    status,
    itemsFetched: fetched,
    itemsNew: saved.itemsNew,
    itemsChanged: saved.itemsChanged,
    error,
    durationMs: Date.now() - started,
  };
  const icon = { SUCCESS: "✔", PARTIAL: "◐", SKIPPED: "⏭", FAILED: "✖", RUNNING: "…" }[status];
  console.log(
    `${icon} [${source.id}] ${status}: pobrano ${fetched}, nowe ${saved.itemsNew}, zmienione ${saved.itemsChanged}` +
      (error ? ` | ${error}` : ""),
  );
  return summary;
};
