/**
 * PPM: Polska Platforma Medyczna, OAI-PMH https://ppm.edu.pl/oai (format oai_cerif_openaire, zestaw patentów).
 *
 * robots.txt PPM (2026-11-21): "User-agent: * / Disallow: / / Crawl-delay: 10".
 * Decyzja: respektujemy robots.txt ściśle, więc na żywo politeFetch kończy się SkipSourceError i run ma status SKIPPED.
 * Parser jest używany w trybie --offline na fixture (prawdziwa odpowiedź pobrana jednorazowo przy rozpoznaniu źródła).
 * Uwaga: w oai_dc zestaw patentów zwraca puste strony, dlatego używamy CERIF.
 */
import { RADAR_CONFIG } from "@/radar.config";
import { readFixture } from "./_shared/http";
import { harvest, oaiRecordsToItems, parseOaiPage } from "./_shared/oai-pmh";
import { runScraperCli } from "./_shared/cli";
import type { ScrapeOptions, ScrapeResult, SourceDefinition } from "./_shared/types";

const CONFIG = RADAR_CONFIG.sources.ppm;

export const run = async ({ limit, offline }: ScrapeOptions): Promise<ScrapeResult> => {
  const base = { baseUrl: CONFIG.url, metadataPrefix: CONFIG.oai.metadataPrefix, keywords: CONFIG.keywords };
  if (offline) {
    const page = parseOaiPage(await readFixture("ppm-patents.xml"));
    return { items: oaiRecordsToItems(page.records, base).slice(0, limit) };
  }
  return harvest({ ...base, set: CONFIG.oai.set, from: CONFIG.oai.from, limit, minDelayMs: CONFIG.minDelayMs });
};

export const source: SourceDefinition = { id: "ppm", run };

if (import.meta.main) await runScraperCli(source);
