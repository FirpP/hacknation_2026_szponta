import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CardDetail, CardsPage, CardsQuery, Domain, ScrapeRun, Stats } from "@/lib/types/cards.types";
import { cardsKeys } from "@/features/cards/cards.keys";

const toSearch = (query: CardsQuery): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
};

export const useCards = (query: CardsQuery, enabled = true) =>
  useQuery({
    enabled,
    queryKey: cardsKeys.list(query),
    queryFn: ({ signal }) => api.get<CardsPage>(`/cards${toSearch(query)}`, signal),
    // Przy zmianie filtra zostawiamy poprzednią stronę na ekranie, zamiast migać pustym stanem
    placeholderData: keepPreviousData,
  });

/**
 * Widok radaru: osobne zapytanie na każdą dziedzinę (API zwraca maks. 100 kart na stronę),
 * żeby najwyżej oceniona dziedzina nie zajęła całego limitu i nie zostawiła pustych ćwiartek.
 */
export const useRadarCards = (query: CardsQuery, domains: Domain[]) =>
  useQueries({
    queries: domains.map((domain) => {
      const q = { ...query, domain, page: 1, pageSize: 100 };
      return {
        queryKey: cardsKeys.list(q),
        queryFn: ({ signal }: { signal: AbortSignal }) => api.get<CardsPage>(`/cards${toSearch(q)}`, signal),
        placeholderData: keepPreviousData,
      };
    }),
    combine: (results) => ({
      items: results.flatMap((r) => r.data?.items ?? []),
      total: results.reduce((sum, r) => sum + (r.data?.total ?? 0), 0),
      isPending: results.some((r) => r.data === undefined && !r.isError),
      isFetching: results.some((r) => r.isFetching),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });

export const useCard = (id: number) =>
  useQuery({
    queryKey: cardsKeys.detail(id),
    queryFn: ({ signal }) => api.get<CardDetail>(`/cards/${id}`, signal),
    enabled: Number.isInteger(id) && id > 0,
  });

export const useStats = () =>
  useQuery({
    queryKey: cardsKeys.stats,
    queryFn: ({ signal }) => api.get<Stats>("/stats", signal),
  });

/** Ostatnie uruchomienia scraperów; ostatni run per źródło wybiera latestRunBySource */
export const useRuns = () =>
  useQuery({
    queryKey: cardsKeys.runs,
    queryFn: ({ signal }) => api.get<ScrapeRun[]>("/runs?limit=60", signal),
  });

/** Najnowszy run każdego źródła (lista z API jest posortowana od najnowszego) */
export const latestRunBySource = (runs: ScrapeRun[] = []): Map<string, ScrapeRun> => {
  const latest = new Map<string, ScrapeRun>();
  for (const run of runs) if (!latest.has(run.source)) latest.set(run.source, run);
  return latest;
};
