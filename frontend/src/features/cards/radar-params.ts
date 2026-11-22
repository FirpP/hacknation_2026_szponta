import type { CardSort, CardsQuery, Domain, ImplementationStatus } from "@/lib/types/cards.types";
import { DOMAINS, STATUSES } from "@/features/cards/cards.labels";

export const SORTS: { value: CardSort; label: string }[] = [
  { value: "innovationScore", label: "Innowacyjność" },
  { value: "applicationPotentialScore", label: "Potencjał zastosowania" },
  { value: "credibilityScore", label: "Wiarygodność" },
  { value: "trl", label: "TRL" },
  { value: "analyzedAt", label: "Najnowsze" },
];

/** Filtry trzymane w URL (da się udostępnić link). innov: brak = tylko innowacje, "all" = wszystkie */
export type RadarFilters = {
  q: string;
  domain?: Domain;
  status?: ImplementationStatus;
  source?: string;
  trlMin?: number;
  trlMax?: number;
  innov: "only" | "all";
  sort: CardSort;
  page: number;
  view: "list" | "radar";
};

const oneOf = <T extends string>(values: readonly T[], v: string | null): T | undefined =>
  v !== null && (values as readonly string[]).includes(v) ? (v as T) : undefined;

const trl = (v: string | null): number | undefined => {
  const n = Number(v);
  return v && Number.isInteger(n) && n >= 1 && n <= 9 ? n : undefined;
};

export const parseFilters = (sp: URLSearchParams): RadarFilters => {
  const page = Number(sp.get("page"));
  let trlMin = trl(sp.get("trlMin"));
  let trlMax = trl(sp.get("trlMax"));
  if (trlMin && trlMax && trlMin > trlMax) [trlMin, trlMax] = [trlMax, trlMin];
  return {
    q: sp.get("q")?.trim() ?? "",
    domain: oneOf(DOMAINS, sp.get("domain")),
    status: oneOf(STATUSES, sp.get("status")),
    source: sp.get("source") || undefined,
    trlMin,
    trlMax,
    innov: sp.get("innov") === "all" ? "all" : "only",
    sort:
      oneOf(
        SORTS.map((s) => s.value),
        sp.get("sort"),
      ) ?? "innovationScore",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    view: sp.get("view") === "radar" ? "radar" : "list",
  };
};

/** Zapis do URL: pomijamy wartości domyślne, żeby linki były krótkie */
export const filtersToSearch = (f: RadarFilters): URLSearchParams => {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.domain) sp.set("domain", f.domain);
  if (f.status) sp.set("status", f.status);
  if (f.source) sp.set("source", f.source);
  if (f.trlMin) sp.set("trlMin", String(f.trlMin));
  if (f.trlMax) sp.set("trlMax", String(f.trlMax));
  if (f.innov === "all") sp.set("innov", "all");
  if (f.sort !== "innovationScore") sp.set("sort", f.sort);
  if (f.page > 1) sp.set("page", String(f.page));
  if (f.view === "radar") sp.set("view", "radar");
  return sp;
};

export const filtersToQuery = (f: RadarFilters, page: number, pageSize: number): CardsQuery => ({
  q: f.q.length > 0 ? f.q : undefined,
  domain: f.domain,
  status: f.status,
  source: f.source,
  trlMin: f.trlMin,
  trlMax: f.trlMax,
  isInnovation: f.innov === "only" ? true : undefined,
  sort: f.sort,
  order: "desc",
  page,
  pageSize,
});

export const hasActiveFilters = (f: RadarFilters) =>
  Boolean(f.q || f.domain || f.status || f.source || f.trlMin || f.trlMax || f.innov === "all");
