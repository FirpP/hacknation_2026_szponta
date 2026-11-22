import type {
  Audience,
  Domain,
  FieldBasis,
  ImplementationStatus,
  RecommendedPath,
  RunStatus,
} from "@/lib/types/cards.types";

export const DOMAIN_LABELS: Record<Domain, string> = {
  TECHNOLOGICAL: "Technologiczna",
  EDUCATIONAL: "Edukacyjna",
  ADMINISTRATIVE: "Administracyjna",
  OTHER: "Inna",
};
export const DOMAINS = Object.keys(DOMAIN_LABELS) as Domain[];

/** Kolejność od najdalej do najbliżej wdrożenia; UNKNOWN na końcu */
export const STATUS_LABELS: Record<ImplementationStatus, string> = {
  CONCEPT: "Koncepcja",
  PROTOTYPE: "Prototyp",
  TESTING: "Testy",
  PILOT: "Pilotaż",
  IN_USE: "Wdrożone",
  UNKNOWN: "Brak danych",
};
export const STATUSES = Object.keys(STATUS_LABELS) as ImplementationStatus[];

/** Ścieżki dalszego rozwoju (reguły w backend/src/analysis/recommend.ts) */
export const PATH_LABELS: Record<RecommendedPath, { label: string; hint: string }> = {
  COMMERCIALIZATION: {
    label: "Komercjalizacja lub licencja",
    hint: "Dojrzałe rozwiązanie technologiczne: sprzedaż praw, licencja, spin-off albo wdrożenie u klienta.",
  },
  TRANSFER: {
    label: "Transfer do innych instytucji",
    hint: "Rozwiązanie działa w praktyce i może zostać przejęte przez podobne szkoły, uczelnie lub urzędy.",
  },
  PILOT: {
    label: "Pilotaż u partnera",
    hint: "Prototyp lub testy: kolejny krok to wdrożenie pilotażowe w realnym środowisku.",
  },
  FURTHER_RND: {
    label: "Dalsze prace B+R",
    hint: "Wczesny etap: potrzebne dalsze badania i finansowanie B+R, zanim pojawi się wdrożenie.",
  },
  FIND_PARTNER: {
    label: "Weryfikacja i szukanie partnera",
    hint: "Za mało danych o wdrożeniu: najpierw kontakt z twórcami i partner, który pomoże ocenić rozwiązanie.",
  },
  NOT_APPLICABLE: {
    label: "Brak rekomendacji",
    hint: "Model ocenił, że rekord nie opisuje innowacji wg Oslo Manual 2018.",
  },
};
export const PATHS = (Object.keys(PATH_LABELS) as RecommendedPath[]).filter((p) => p !== "NOT_APPLICABLE");

/** Grupy odbiorców z doprecyzowania wyzwania (FAQ, pkt 3) */
export const AUDIENCE_LABELS: Record<Audience, string> = {
  INVESTORS: "Inwestorzy",
  PUBLIC_INSTITUTIONS: "Instytucje publiczne i samorządy",
  UNIVERSITIES: "Uczelnie i jednostki naukowe",
  SCHOOLS: "Szkoły i placówki edukacyjne",
  STARTUPS_COMPANIES: "Startupy i przedsiębiorstwa",
  INNOVATORS: "Innowatorzy i wynalazcy",
};
export const AUDIENCES = Object.keys(AUDIENCE_LABELS) as Audience[];

export const FIELD_LABELS: Record<string, string> = {
  title: "Nazwa",
  description: "Opis",
  applicationArea: "Obszar zastosowania",
  domain: "Dziedzina",
  isInnovation: "Innowacja wg Oslo Manual",
  implementationStatus: "Poziom wdrożenia",
  trl: "TRL",
  innovationScore: "Innowacyjność",
  applicationPotentialScore: "Potencjał zastosowania",
  credibilityScore: "Wiarygodność",
};
export const FIELD_ORDER = Object.keys(FIELD_LABELS);

export const BASIS_LABELS: Record<FieldBasis, { label: string; hint: string }> = {
  CONFIRMED: { label: "Fakt", hint: "Wynika wprost ze źródła i ma zweryfikowany cytat" },
  ESTIMATED: { label: "Szacunek", hint: "Wnioskowanie modelu AI, bez dosłownego potwierdzenia w źródle" },
};

export const RUN_STATUS: Record<RunStatus, { label: string; tone: "ok" | "warn" | "bad" | "off" }> = {
  SUCCESS: { label: "Działa", tone: "ok" },
  PARTIAL: { label: "Częściowo", tone: "warn" },
  RUNNING: { label: "W trakcie", tone: "warn" },
  FAILED: { label: "Błąd", tone: "bad" },
  SKIPPED: { label: "Pominięte", tone: "off" },
};

/** Opis źródeł do sekcji „Źródła danych” (nazwy jak w backend/src/radar.config.ts) */
export const SOURCES: { id: string; name: string; how: string; what: string }[] = [
  { id: "ncbr", name: "NCBR", how: "strona gov.pl + podstrony projektów", what: "Sukcesy beneficjentów programów B+R" },
  { id: "baztol", name: "BazTOL", how: "wyszukiwarka katalogu (PUT)", what: "Katalog zasobów technicznych online" },
  { id: "epo", name: "EPO", how: "oficjalne API EPO OPS", what: "Europejskie zgłoszenia patentowe" },
  { id: "uprp", name: "UPRP", how: "EPO OPS, publikacje PL", what: "Polskie patenty i wzory użytkowe" },
  { id: "ppm", name: "Polska Platforma Medyczna", how: "OAI-PMH", what: "Patenty uczelni medycznych" },
  { id: "pbn", name: "PBN", how: "API (token instytucji)", what: "Publikacje i wdrożenia naukowe" },
  { id: "pan", name: "Czasopisma PAN", how: "OAI-PMH dLibra", what: "Artykuły naukowe PAN" },
  { id: "interreg", name: "Interreg", how: "lista projektów", what: "Projekty współpracy transgranicznej" },
];

export const shortSourceName = (id: string, fallback: string): string =>
  SOURCES.find((s) => s.id === id)?.name ?? fallback;

const dateFmt = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "–");
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "–");
