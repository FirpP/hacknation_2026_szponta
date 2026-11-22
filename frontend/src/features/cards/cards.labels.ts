import type { Domain, FieldBasis, ImplementationStatus, RunStatus } from "@/lib/types/cards.types";

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
