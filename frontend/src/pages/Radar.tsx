import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCards, useRadarCards, useStats } from "@/features/cards/cards.hooks";
import { DOMAINS } from "@/features/cards/cards.labels";
import CardTile from "@/features/cards/CardTile";
import FiltersBar from "@/features/cards/FiltersBar";
import RadarChart from "@/features/cards/RadarChart";
import {
  filtersToQuery,
  filtersToSearch,
  hasActiveFilters,
  parseFilters,
  type RadarFilters,
} from "@/features/cards/radar-params";

const PAGE_SIZE = 24;

const Radar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);
  const isRadar = filters.view === "radar";

  const listQuery = filtersToQuery(filters, filters.page, PAGE_SIZE);
  // Lista: zwykłe stronicowanie. Radar: do 100 kart z każdej dziedziny (zapytanie listy wtedy nie startuje)
  const list = useCards(listQuery, !isRadar);
  const radar = useRadarCards(
    filtersToQuery(filters, 1, 100),
    isRadar ? (filters.domain ? [filters.domain] : DOMAINS) : [],
  );
  const view = isRadar
    ? {
        data: radar.isPending ? undefined : { items: radar.items, total: radar.total },
        error: radar.error,
        isFetching: radar.isFetching,
      }
    : { data: list.data, error: list.error, isFetching: list.isFetching };
  const stats = useStats();

  const update = useCallback(
    (patch: Partial<RadarFilters>) =>
      setSearchParams((prev) => filtersToSearch({ ...parseFilters(prev), ...patch }), { replace: true }),
    [setSearchParams],
  );
  const reset = () => setSearchParams(filtersToSearch({ ...parseFilters(new URLSearchParams()), view: filters.view }));

  const data = view.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Radar Innowacji</div>
          <h1>{isRadar ? "Widok radaru" : "Karty innowacji"}</h1>
        </div>
        <div className="seg" role="group" aria-label="Widok">
          <button type="button" aria-pressed={!isRadar} onClick={() => update({ view: "list" })}>
            Lista
          </button>
          <button type="button" aria-pressed={isRadar} onClick={() => update({ view: "radar", page: 1 })}>
            Radar
          </button>
        </div>
      </div>

      <FiltersBar filters={filters} sources={stats.data?.sources ?? []} onChange={update} />

      <div className="toolbar">
        <span aria-live="polite">
          {data ? (
            <>
              Znaleziono <b>{data.total}</b> {data.total === 1 ? "kartę" : "kart"}
              {filters.innov === "only" && " spełniających definicję innowacji (szacunek AI)"}
            </>
          ) : (
            "Wczytywanie…"
          )}
          {view.isFetching && data && " · odświeżanie…"}
        </span>
        {hasActiveFilters(filters) && (
          <button type="button" className="link-btn" onClick={reset}>
            Wyczyść filtry
          </button>
        )}
      </div>

      {view.error ? (
        <div className="alert" role="alert">
          Nie udało się pobrać kart: {view.error.message}
        </div>
      ) : !data ? (
        <div className="tiles">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="empty">
          <h3>Brak kart dla tych filtrów</h3>
          <p>Spróbuj innej frazy albo poszerz filtry.</p>
          {hasActiveFilters(filters) && (
            <p style={{ marginTop: 14 }}>
              <button type="button" className="btn sm" onClick={reset}>
                Wyczyść filtry
              </button>
            </p>
          )}
        </div>
      ) : isRadar ? (
        <RadarChart cards={data.items} total={data.total} />
      ) : (
        <>
          <div className="tiles">
            {data.items.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label="Strony wyników">
              <button
                type="button"
                className="btn sm ghost"
                disabled={filters.page <= 1}
                onClick={() => update({ page: filters.page - 1 })}
              >
                &lt; Poprzednia
              </button>
              <span>
                Strona {filters.page} z {pages}
              </span>
              <button
                type="button"
                className="btn sm ghost"
                disabled={filters.page >= pages}
                onClick={() => update({ page: filters.page + 1 })}
              >
                Następna &gt;
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default Radar;
