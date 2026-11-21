/**
 * Konfiguracja Radaru Innowacji: JEDYNE miejsce z zapytaniami, słowami kluczowymi, limitami i opóźnieniami.
 * Sekrety (klucze API) są w .env, nie tutaj.
 */

export const SOURCE_IDS = ["ncbr", "ppm", "baztol", "epo", "uprp", "pbn", "pan", "interreg"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export type SourceConfig = {
  /** Nazwa źródła pokazywana na karcie */
  name: string;
  /** Strona startowa / endpoint */
  url: string;
  /** Limit rekordów na jedno uruchomienie (tryb demo). Brak = RADAR_CONFIG.defaultLimit */
  limit?: number;
  /** Minimalny odstęp między requestami do hosta w ms (nadpisuje minDelayMs, jeśli większy) */
  minDelayMs?: number;
  /** Słowa kluczowe: wyszukiwanie (BazTOL) albo filtr lokalny po pobraniu (NCBR, OAI-PMH). Pusta lista = bez filtra */
  keywords?: string[];
  /** Pobieranie stron szczegółów rekordów (NCBR) */
  fetchDetails?: boolean;
  /** Zapytanie CQL dla EPO OPS */
  cql?: string;
  /** Zestaw i format OAI-PMH */
  oai?: { metadataPrefix: string; set?: string; from?: string };
};

export const RADAR_CONFIG = {
  /** Domyślny limit rekordów na źródło w trybie demo */
  defaultLimit: 20,
  /** Minimalny odstęp między requestami do jednego hosta (wymóg: min. 1 s) */
  minDelayMs: 1000,
  requestTimeoutMs: 20_000,
  /** Liczba prób (1 + ponowienia) dla błędów sieci, 429 i 5xx */
  maxAttempts: 3,
  /** Lock uznajemy za porzucony po tym czasie */
  lockStaleAfterMs: 6 * 60 * 60 * 1000,

  sources: {
    ncbr: {
      name: "NCBR – Wyszukiwarka sukcesów beneficjentów",
      url: "https://www.gov.pl/web/ncbr/wyszukiwarka-sukcesow-beneficjentow",
      // Strona nie ma wyszukiwarki po stronie serwera: wszystkie ~315 pozycji są w jednym HTML-u.
      // Pusta lista = pierwsze N pozycji; podaj słowa, żeby filtrować lokalnie (bez rozróżniania wielkości liter).
      keywords: [],
      // Pobieraj też stronę "Dowiedz się więcej" każdego projektu (opis, efekty, wdrożenie): +1 request/rekord
      fetchDetails: true,
    },
    ppm: {
      name: "Polska Platforma Medyczna (OAI-PMH)",
      url: "https://ppm.edu.pl/oai",
      // robots.txt PPM: "User-agent: * Disallow: /" => na żywo SKIPPED (decyzja: ściśle respektujemy robots.txt).
      // Parser działa na fixture (tryb --offline).
      minDelayMs: 10_000,
      oai: { metadataPrefix: "oai_cerif_openaire", set: "openaire_cris_patents", from: "2025-01-01" },
      keywords: [],
    },
    baztol: {
      name: "BazTOL – Baza Technicznych Zasobów Online (PUT)",
      url: "http://baztol.library.put.poznan.pl/baztol_czytelnik/baztol",
      // Wyszukiwarka BazTOL dopasowuje całe słowa ("innowac" daje 1 wynik, "innowacje" 21), ok. 20 wyników na stronę
      keywords: ["innowacje", "automatyka", "energetyka", "edukacja", "robot"],
    },
    epo: {
      name: "EPO – Open Patent Services",
      url: "https://ops.epo.org/3.2/rest-services",
      // TODO(verify): składnia CQL sprawdzona tylko z dokumentacji OPS, nie na żywo (brak kluczy w trakcie budowy).
      cql: 'pn=EP and pa any "politechnika uniwersytet instytut" and pd within "2023 2026"',
    },
    uprp: {
      name: "UPRP – polskie zgłoszenia i patenty (via EPO OPS)",
      url: "https://ops.epo.org/3.2/rest-services",
      // e-wyszukiwarka UPRP jest za WAF-em (Imperva) z pułapką na boty i nie ma publicznego API,
      // więc polskie publikacje (prefiks PL) pobieramy z bazy DOCDB w EPO OPS.
      // TODO(verify): czy "pn=PL" filtruje po kraju publikacji w OPS CQL.
      cql: 'pn=PL and pd within "2024 2026" and ta any "innowacyjny sposób urządzenie system"',
    },
    pbn: {
      name: "Polska Bibliografia Naukowa (PBN)",
      url: "https://pbn.nauka.gov.pl/api/v1",
      // API wymaga tokenu aplikacji (X-App-Id / X-App-Token) wydawanego instytucjom.
    },
    pan: {
      name: "Czasopisma PAN (dLibra, OAI-PMH)",
      // TODO(verify): standardowa ścieżka OAI dLibra; 2026-11-21 zwracała 502, a strona ma anti-bota PoW.
      url: "https://www.czasopisma.pan.pl/dlibra/oai-pmh-repository.xml",
      oai: { metadataPrefix: "oai_dc", from: "2025-01-01" },
      keywords: [],
    },
    interreg: {
      name: "Interreg – lista projektów",
      url: "https://interreg.gov.pl/lista-projektow/",
      // TODO(verify): 2026-11-21 host nie odpowiadał (timeout TCP); nie znamy struktury strony.
    },
  } satisfies Record<SourceId, SourceConfig>,
} as const;

export const sourceLimit = (id: SourceId): number =>
  (RADAR_CONFIG.sources[id] as SourceConfig).limit ?? RADAR_CONFIG.defaultLimit;
