/**
 * PBN: Polska Bibliografia Naukowa.
 *
 * API https://pbn.nauka.gov.pl/api/v1 odpowiada 403: "należy podać poprawny token aplikacji" (2026-11-21).
 * Token (X-App-Id / X-App-Token) wydaje PBN instytucjom. Publiczna wyszukiwarka /core to SPA bez otwartego endpointu.
 * TODO(verify): po uzyskaniu tokenu sprawdzić w dokumentacji PBN API endpoint wyszukiwania publikacji
 * i dopisać wywołanie. Do tego czasu źródło jest świadomie pomijane (SKIPPED), bez zgadywania endpointów.
 */
import { ENV } from "@lib/constants/env";
import { runScraperCli } from "./_shared/cli";
import { SkipSourceError, type ScrapeResult, type SourceDefinition } from "./_shared/types";

export const run = async (): Promise<ScrapeResult> => {
  if (!ENV.PBN_APP_ID || !ENV.PBN_APP_TOKEN) {
    throw new SkipSourceError("Brak PBN_APP_ID/PBN_APP_TOKEN (token aplikacji wydaje PBN instytucjom)");
  }
  throw new SkipSourceError(
    "Token PBN jest ustawiony, ale endpoint wyszukiwania nie został zweryfikowany, TODO(verify)",
  );
};

export const source: SourceDefinition = { id: "pbn", run };

if (import.meta.main) await runScraperCli(source);
