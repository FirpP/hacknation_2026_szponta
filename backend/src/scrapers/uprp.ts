/**
 * UPRP: polskie zgłoszenia i patenty.
 *
 * e-wyszukiwarka UPRP (ewyszukiwarka.pue.uprp.gov.pl) to SPA za WAF-em Imperva z linkiem-pułapką na boty
 * ("bot_ deception.html"). Wewnętrzne XHR (api/v2/deterministic-search) są nieudokumentowane,
 * a host API jest ustawiany w runtime. Reverse engineering byłby zgadywaniem i omijaniem zabezpieczeń.
 * Polskie publikacje patentowe są w bazie DOCDB, więc pobieramy je przez oficjalne API EPO OPS (kod kraju PL).
 * Zapytanie: radar.config.ts -> sources.uprp.cql (TODO(verify) składni "pn=PL").
 */
import { RADAR_CONFIG } from "@/radar.config";
import { searchBiblio } from "./_shared/epo-ops";
import { runScraperCli } from "./_shared/cli";
import { SkipSourceError, type ScrapeOptions, type ScrapeResult, type SourceDefinition } from "./_shared/types";

export const run = async ({ limit, offline }: ScrapeOptions): Promise<ScrapeResult> => {
  if (offline) throw new SkipSourceError("Brak fixture'a OPS (nie mieliśmy kluczy przy budowie), TODO(verify)");
  const items = await searchBiblio(RADAR_CONFIG.sources.uprp.cql, limit);
  // Zostawiamy tylko publikacje PL na wypadek, gdyby CQL zwróciło też inne kraje
  return { items: items.filter((item) => item.externalId.startsWith("PL")) };
};

export const source: SourceDefinition = { id: "uprp", run };

if (import.meta.main) await runScraperCli(source);
