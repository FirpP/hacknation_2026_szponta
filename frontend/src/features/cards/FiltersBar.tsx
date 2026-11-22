import { useEffect, useState } from "react";
import { DOMAIN_LABELS, DOMAINS, STATUS_LABELS, STATUSES, shortSourceName } from "@/features/cards/cards.labels";
import { SORTS, type RadarFilters } from "@/features/cards/radar-params";

type Props = {
  filters: RadarFilters;
  sources: { id: string; name: string; cards: number }[];
  onChange: (patch: Partial<RadarFilters>) => void;
};

const TRL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const FiltersBar = ({ filters, sources, onChange }: Props) => {
  const [q, setQ] = useState(filters.q);
  const [collapsed, setCollapsed] = useState(true);

  // Zmiana URL z zewnątrz (np. reset, wstecz w przeglądarce) nadpisuje pole wyszukiwania
  const [syncedQ, setSyncedQ] = useState(filters.q);
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q);
    setQ(filters.q);
  }

  // Debounce 300 ms, żeby nie pytać API po każdej literze
  useEffect(() => {
    if (q.trim() === filters.q) return;
    const t = setTimeout(() => onChange({ q: q.trim(), page: 1 }), 300);
    return () => clearTimeout(t);
  }, [q, filters.q, onChange]);

  const select = <K extends keyof RadarFilters>(key: K, value: string) =>
    onChange({ [key]: value === "" ? undefined : value, page: 1 } as Partial<RadarFilters>);

  const trlSelect = (key: "trlMin" | "trlMax", value: string) =>
    onChange({ [key]: value === "" ? undefined : Number(value), page: 1 });

  return (
    <form className={`filters${collapsed ? " collapsed" : ""}`} role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="fld">
        Szukaj w nazwie, opisie i obszarze zastosowania
        <input
          type="search"
          value={q}
          placeholder="np. czujnik, szkoła, energia"
          maxLength={200}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <label className="fld">
        Dziedzina
        <select value={filters.domain ?? ""} onChange={(e) => select("domain", e.target.value)}>
          <option value="">Wszystkie</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {DOMAIN_LABELS[d]}
            </option>
          ))}
        </select>
      </label>
      <label className="fld">
        Poziom wdrożenia
        <select value={filters.status ?? ""} onChange={(e) => select("status", e.target.value)}>
          <option value="">Wszystkie</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="fld">
        Źródło
        <select value={filters.source ?? ""} onChange={(e) => select("source", e.target.value)}>
          <option value="">Wszystkie</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {shortSourceName(s.id, s.name)} ({s.cards})
            </option>
          ))}
        </select>
      </label>
      <div className="row2">
        <div className="fld">
          TRL (szacunek)
          <span className="pair">
            <select
              aria-label="TRL od"
              value={filters.trlMin ?? ""}
              onChange={(e) => trlSelect("trlMin", e.target.value)}
            >
              <option value="">od</option>
              {TRL_VALUES.filter((n) => !filters.trlMax || n <= filters.trlMax).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            –
            <select
              aria-label="TRL do"
              value={filters.trlMax ?? ""}
              onChange={(e) => trlSelect("trlMax", e.target.value)}
            >
              <option value="">do</option>
              {TRL_VALUES.filter((n) => !filters.trlMin || n >= filters.trlMin).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </span>
        </div>
        <label className="fld">
          Sortuj wg
          <select value={filters.sort} onChange={(e) => select("sort", e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="check" title="Ocena modelu AI wg definicji Oslo Manual 2018">
          <input
            type="checkbox"
            checked={filters.innov === "only"}
            onChange={(e) => onChange({ innov: e.target.checked ? "only" : "all", page: 1 })}
          />
          Tylko innowacje wg Oslo Manual
        </label>
      </div>
      <button type="button" className="link-btn filters-toggle" onClick={() => setCollapsed((v) => !v)}>
        {collapsed ? "Więcej filtrów" : "Mniej filtrów"}
      </button>
    </form>
  );
};

export default FiltersBar;
