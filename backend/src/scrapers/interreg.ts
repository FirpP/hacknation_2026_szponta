/**
 * Interreg: lista projektów (https://interreg.gov.pl/lista-projektow/).
 *
 * TODO(verify): 2026-11-21 host nie odpowiadał (timeout TCP na 80 i 443, DNS działa), więc nie znamy struktury
 * strony, robots.txt ani ewentualnego API (np. WordPress REST). Nie zgadujemy selektorów: źródło jest
 * pomijane (SKIPPED). Po weryfikacji: pobrać robots.txt, sprawdzić /wp-json/ i zapisać fixture.
 */
import { runScraperCli } from "./_shared/cli";
import { SkipSourceError, type ScrapeResult, type SourceDefinition } from "./_shared/types";

export const run = async (): Promise<ScrapeResult> => {
  throw new SkipSourceError("Źródło niezweryfikowane (host nie odpowiadał przy rozpoznaniu), TODO(verify)");
};

export const source: SourceDefinition = { id: "interreg", run };

if (import.meta.main) await runScraperCli(source);
