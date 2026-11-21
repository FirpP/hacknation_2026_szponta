/**
 * EPO: patenty europejskie polskich zgłaszających.
 * European Patent Register (register.epo.org) jest za Cloudflare i regulamin zakazuje automatów,
 * dlatego używamy oficjalnego API EPO OPS (wymaga darmowych kluczy, bez nich run ma status SKIPPED).
 * Zapytanie CQL: radar.config.ts -> sources.epo.cql (TODO(verify) na żywo).
 */
import { RADAR_CONFIG } from "@/radar.config";
import { searchBiblio } from "./_shared/epo-ops";
import { runScraperCli } from "./_shared/cli";
import { SkipSourceError, type ScrapeOptions, type ScrapeResult, type SourceDefinition } from "./_shared/types";

export const run = async ({ limit, offline }: ScrapeOptions): Promise<ScrapeResult> => {
  if (offline) throw new SkipSourceError("Brak fixture'a OPS (nie mieliśmy kluczy przy budowie), TODO(verify)");
  return { items: await searchBiblio(RADAR_CONFIG.sources.epo.cql, limit) };
};

export const source: SourceDefinition = { id: "epo", run };

if (import.meta.main) await runScraperCli(source);
