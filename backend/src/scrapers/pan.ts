/**
 * Czasopisma PAN: biblioteka cyfrowa dLibra, OAI-PMH (oai_dc).
 *
 * TODO(verify): ścieżka /dlibra/oai-pmh-repository.xml to standard dLibra (PCSS). 2026-11-21 zwracała 502,
 * a robots.txt i strona główna są za weryfikacją anti-bot (proof-of-work). politeFetch traktuje robots.txt
 * w postaci HTML jako niedostępny, więc run kończy się SKIPPED. Niczego nie obchodzimy.
 * Brak fixture'a: nie udało się pobrać żadnej prawdziwej odpowiedzi.
 */
import * as cheerio from "cheerio";
import { RADAR_CONFIG } from "@/radar.config";
import { harvest, type OaiRecord } from "./_shared/oai-pmh";
import { runScraperCli } from "./_shared/cli";
import { SkipSourceError, type ScrapeOptions, type ScrapeResult, type SourceDefinition } from "./_shared/types";

const CONFIG = RADAR_CONFIG.sources.pan;

/** W oai_dc dLibra zwykle podaje URL publikacji w dc:identifier; inaczej zostaje GetRecord */
const dcHttpIdentifier = (record: OaiRecord): string | undefined => {
  const $ = cheerio.load(record.xml, { xml: true });
  return $("dc\\:identifier")
    .map((_, el) => $(el).text().trim())
    .get()
    .find((v) => /^https?:\/\//.test(v));
};

export const run = async ({ limit, offline }: ScrapeOptions): Promise<ScrapeResult> => {
  if (offline) throw new SkipSourceError("Brak fixture'a dla PAN (endpoint niezweryfikowany), TODO(verify)");
  return harvest({
    baseUrl: CONFIG.url,
    metadataPrefix: CONFIG.oai.metadataPrefix,
    from: CONFIG.oai.from,
    keywords: CONFIG.keywords,
    limit,
    recordUrl: (r) =>
      dcHttpIdentifier(r) ??
      `${CONFIG.url}?${new URLSearchParams({ verb: "GetRecord", metadataPrefix: CONFIG.oai.metadataPrefix, identifier: r.identifier })}`,
  });
};

export const source: SourceDefinition = { id: "pan", run };

if (import.meta.main) await runScraperCli(source);
