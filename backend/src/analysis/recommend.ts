/**
 * Rekomendacja dalszej ścieżki i odbiorców dla karty innowacji.
 * Deterministyczne reguły na polach karty (bez LLM): ten sam wejściowy zestaw pól daje zawsze ten sam wynik,
 * a każda rekomendacja ma listę powodów, które da się sprawdzić na karcie. Całość to szacunek (ESTIMATED).
 */
import type { DOMAINS, IMPLEMENTATION_STATUSES } from "./card.schema";

export const PATHS = [
  "COMMERCIALIZATION",
  "TRANSFER",
  "PILOT",
  "FURTHER_RND",
  "FIND_PARTNER",
  "NOT_APPLICABLE",
] as const;
export type RecommendedPath = (typeof PATHS)[number];

/** Grupy odbiorców z FAQ (pkt 3) */
export const AUDIENCES = [
  "INVESTORS",
  "PUBLIC_INSTITUTIONS",
  "UNIVERSITIES",
  "SCHOOLS",
  "STARTUPS_COMPANIES",
  "INNOVATORS",
] as const;
export type Audience = (typeof AUDIENCES)[number];

export type RecommendInput = {
  domain: (typeof DOMAINS)[number];
  implementationStatus: (typeof IMPLEMENTATION_STATUSES)[number];
  trl: number | null;
  isInnovation: boolean | null;
  innovationScore: number;
  applicationPotentialScore: number;
  credibilityScore: number;
};

export type Recommendation = {
  path: RecommendedPath;
  reasons: string[];
  audiences: Audience[];
  metrics: string[];
  basis: "ESTIMATED";
};

type Rule = { path: RecommendedPath; when: (c: RecommendInput) => boolean; reasons: (c: RecommendInput) => string[] };

const DEPLOYED = new Set(["PILOT", "IN_USE"]);
const IN_DEVELOPMENT = new Set(["PROTOTYPE", "TESTING"]);

// Te same nazwy co STATUS_LABELS we froncie: powody są pokazywane użytkownikowi wprost
const STATUS_LABELS: Record<RecommendInput["implementationStatus"], string> = {
  CONCEPT: "koncepcja",
  PROTOTYPE: "prototyp",
  TESTING: "testy",
  PILOT: "pilotaż",
  IN_USE: "wdrożone",
  UNKNOWN: "brak danych",
};

const statusReason = (c: RecommendInput) => `poziom wdrożenia: ${STATUS_LABELS[c.implementationStatus]}`;
const trlReason = (c: RecommendInput) => (c.trl === null ? null : `TRL ${c.trl}`);
const compact = (items: (string | null)[]) => items.filter((v): v is string => v !== null);

/** Reguły sprawdzane po kolei; wygrywa pierwsza pasująca. Ostatnia łapie wszystko. */
export const RULES: readonly Rule[] = [
  {
    path: "NOT_APPLICABLE",
    when: (c) => c.isInnovation === false,
    reasons: () => ["model ocenił, że rekord nie opisuje innowacji wg Oslo Manual 2018"],
  },
  {
    path: "COMMERCIALIZATION",
    when: (c) =>
      c.domain === "TECHNOLOGICAL" &&
      (DEPLOYED.has(c.implementationStatus) || (c.trl ?? 0) >= 7) &&
      c.innovationScore >= 4,
    reasons: (c) =>
      compact([
        "rozwiązanie technologiczne",
        DEPLOYED.has(c.implementationStatus) ? statusReason(c) : `TRL ${c.trl} ≥ 7`,
        `innowacyjność ${c.innovationScore}/5 ≥ 4`,
      ]),
  },
  {
    path: "TRANSFER",
    when: (c) => DEPLOYED.has(c.implementationStatus) && c.applicationPotentialScore >= 3,
    reasons: (c) => [
      statusReason(c) + " (działa w praktyce)",
      `potencjał zastosowania w innych organizacjach ${c.applicationPotentialScore}/5 ≥ 3`,
    ],
  },
  {
    path: "PILOT",
    when: (c) => IN_DEVELOPMENT.has(c.implementationStatus) || (c.trl !== null && c.trl >= 4 && c.trl <= 6),
    reasons: (c) =>
      compact([
        IN_DEVELOPMENT.has(c.implementationStatus) ? statusReason(c) : null,
        c.trl !== null && c.trl >= 4 && c.trl <= 6
          ? `TRL ${c.trl} (4–6: walidacja w środowisku zbliżonym do docelowego)`
          : trlReason(c),
        "brak potwierdzonego wdrożenia",
      ]),
  },
  {
    path: "FURTHER_RND",
    when: (c) => c.implementationStatus === "CONCEPT" || (c.trl !== null && c.trl <= 3),
    reasons: (c) =>
      compact([
        c.implementationStatus === "CONCEPT" ? statusReason(c) : null,
        c.trl !== null && c.trl <= 3 ? `TRL ${c.trl} ≤ 3` : null,
      ]),
  },
  {
    path: "FIND_PARTNER",
    when: () => true,
    reasons: (c) =>
      compact([
        c.implementationStatus === "UNKNOWN" ? "źródło nie podaje statusu wdrożenia" : statusReason(c),
        DEPLOYED.has(c.implementationStatus) ? `potencjał zastosowania ${c.applicationPotentialScore}/5 < 3` : null,
        `wiarygodność źródła ${c.credibilityScore}/5`,
      ]),
  },
];

const DOMAIN_AUDIENCES: Record<RecommendInput["domain"], Audience[]> = {
  TECHNOLOGICAL: ["STARTUPS_COMPANIES"],
  EDUCATIONAL: ["SCHOOLS", "UNIVERSITIES"],
  ADMINISTRATIVE: ["PUBLIC_INSTITUTIONS"],
  OTHER: ["PUBLIC_INSTITUTIONS"],
};

const PATH_AUDIENCES: Record<RecommendedPath, Audience[]> = {
  COMMERCIALIZATION: ["INVESTORS", "STARTUPS_COMPANIES"],
  TRANSFER: ["PUBLIC_INSTITUTIONS"],
  PILOT: ["PUBLIC_INSTITUTIONS"],
  FURTHER_RND: ["UNIVERSITIES", "INNOVATORS"],
  FIND_PARTNER: ["UNIVERSITIES", "INNOVATORS"],
  NOT_APPLICABLE: [],
};

/** Mierniki, po których poznamy, że ścieżka zadziałała (krok e scenariusza demo) */
export const PATH_METRICS: Record<RecommendedPath, string[]> = {
  COMMERCIALIZATION: [
    "umowa licencyjna, sprzedaż praw lub spin-off w ciągu 12 miesięcy",
    "co najmniej 3 firmy lub inwestorzy zainteresowani po pierwszym kontakcie",
    "pierwszy klient komercyjny spoza instytucji twórcy",
  ],
  TRANSFER: [
    "co najmniej 2 nowe instytucje wdrażają rozwiązanie w ciągu 12 miesięcy",
    "liczba użytkowników w instytucjach przejmujących",
    "czas od pierwszego kontaktu do uruchomienia u odbiorcy",
  ],
  PILOT: [
    "pilotaż uruchomiony u co najmniej 1 partnera w ciągu 6 miesięcy",
    "wzrost TRL o co najmniej 1 poziom po pilotażu",
    "raport z testów z mierzalnymi wynikami",
  ],
  FURTHER_RND: [
    "złożony wniosek o finansowanie B+R (np. NCBR, NCN, Fundusze Europejskie)",
    "osiągnięcie TRL 4 (walidacja w laboratorium)",
    "publikacja lub zgłoszenie patentowe",
  ],
  FIND_PARTNER: [
    "potwierdzony u twórców aktualny status wdrożenia",
    "pozyskany co najmniej 1 partner wdrożeniowy",
    "uzupełniona dokumentacja (wyższa ocena wiarygodności przy kolejnej analizie)",
  ],
  NOT_APPLICABLE: [],
};

export const recommend = (card: RecommendInput): Recommendation => {
  const rule = RULES.find((r) => r.when(card))!;
  const audiences =
    rule.path === "NOT_APPLICABLE" ? [] : [...PATH_AUDIENCES[rule.path], ...DOMAIN_AUDIENCES[card.domain]];
  // Kolejność jak w AUDIENCES, bez powtórzeń
  const unique = AUDIENCES.filter((a) => audiences.includes(a));
  return {
    path: rule.path,
    reasons: rule.reasons(card),
    audiences: unique,
    metrics: PATH_METRICS[rule.path],
    basis: "ESTIMATED",
  };
};
