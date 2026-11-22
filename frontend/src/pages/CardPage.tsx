import { Link, useNavigate, useParams } from "react-router-dom";
import { isApiError } from "@/lib/api-client";
import type { CardDetail } from "@/lib/types/cards.types";
import { useCard, useSimilarCards } from "@/features/cards/cards.hooks";
import BasisChip from "@/features/cards/BasisChip";
import EvidenceList from "@/features/cards/EvidenceList";
import ScorePips from "@/features/cards/ScorePips";
import {
  AUDIENCE_LABELS,
  DOMAIN_LABELS,
  FIELD_LABELS,
  PATH_LABELS,
  STATUS_LABELS,
  formatDate,
  formatDateTime,
  shortSourceName,
} from "@/features/cards/cards.labels";

const SCORE_KEYS = [
  { key: "innovation", field: "innovationScore" },
  { key: "applicationPotential", field: "applicationPotentialScore" },
  { key: "credibility", field: "credibilityScore" },
] as const;

const RecommendationBlock = ({ recommendation: rec }: { recommendation: CardDetail["recommendation"] }) => {
  const path = PATH_LABELS[rec.path];
  return (
    <div className="block rec">
      <h2>
        Co dalej? Rekomendowana ścieżka <BasisChip basis={rec.basis} />
      </h2>
      <div className={`rec-path${rec.path === "NOT_APPLICABLE" ? " off" : ""}`}>
        <b>{path.label}</b>
        <span>{path.hint}</span>
      </div>
      {rec.reasons.length > 0 && rec.path !== "NOT_APPLICABLE" && (
        <>
          <h4>Dlaczego ta ścieżka</h4>
          <ul>
            {rec.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}
      {rec.audiences.length > 0 && (
        <>
          <h4>Do kogo skierować</h4>
          <div className="rec-aud">
            {rec.audiences.map((a) => (
              <Link
                key={a}
                className="badge"
                to={`/radar?audience=${a}`}
                title="Zobacz inne karty rekomendowane tej grupie"
              >
                {AUDIENCE_LABELS[a]}
              </Link>
            ))}
          </div>
        </>
      )}
      {rec.metrics.length > 0 && (
        <>
          <h4>Jak zmierzyć, że ścieżka zadziałała</h4>
          <ul>
            {rec.metrics.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
      <p className="rec-note">
        Rekomendacja wynika z jawnych reguł na polach karty (poziom wdrożenia, TRL, oceny), bez dodatkowego zapytania do
        AI. Ten sam zestaw pól daje zawsze tę samą ścieżkę.
      </p>
    </div>
  );
};

const SimilarPanel = ({ cardId }: { cardId: number }) => {
  const { data, error, isPending } = useSimilarCards(cardId);
  const duplicates = data?.filter((s) => s.possibleDuplicate).length ?? 0;
  return (
    <section className="panel" aria-labelledby="sim-h" style={{ padding: 0 }}>
      <h3 id="sim-h">Podobne rozwiązania</h3>
      <div className="in">
        {error ? (
          <span>Nie udało się pobrać podobnych kart: {error.message}</span>
        ) : isPending ? (
          <span>Wczytywanie…</span>
        ) : data.length === 0 ? (
          <span>Brak podobnych kart w bazie.</span>
        ) : (
          <>
            {duplicates > 0 && (
              <span className="badge warn">
                {duplicates === 1 ? "1 możliwy duplikat" : `${duplicates} możliwe duplikaty`}
              </span>
            )}
            <ul className="sim-list">
              {data.map((s) => (
                <li key={s.id}>
                  <Link to={`/karty/${s.id}`}>{s.title}</Link>
                  <small>
                    {DOMAIN_LABELS[s.domain]} · {STATUS_LABELS[s.implementationStatus]} · podobieństwo{" "}
                    {Math.round(s.score * 100)}%{s.possibleDuplicate && " · możliwy duplikat"}
                  </small>
                </li>
              ))}
            </ul>
          </>
        )}
        <span>
          Podobieństwo słów w nazwie, opisie i obszarze zastosowania (TF-IDF). Pomaga znaleźć podobne rozwiązania i
          uniknąć dublowania prac.
        </span>
      </div>
    </section>
  );
};

const CardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const cardId = Number(id);
  const { data: card, error, isPending } = useCard(cardId);

  // Wracamy do radaru z zachowanymi filtrami, jeśli przyszliśmy z niego
  const goBack = (e: React.MouseEvent) => {
    if (window.history.state?.idx > 0) {
      e.preventDefault();
      navigate(-1);
    }
  };

  if (!Number.isInteger(cardId) || cardId <= 0 || isApiError(error, 404)) {
    return (
      <div className="wrap page">
        <div className="empty">
          <h3>Nie ma takiej karty</h3>
          <p>
            <Link className="ext" to="/radar">
              Przejdź do listy kart
            </Link>
          </p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="wrap page">
        <div className="alert" role="alert">
          Nie udało się pobrać karty: {error.message}
        </div>
      </div>
    );
  }
  if (isPending || !card) {
    return (
      <div className="wrap page">
        <div className="skeleton" />
      </div>
    );
  }

  const fb = card.fieldBasis;
  const innovationLabel = card.isInnovation === null ? "Brak oceny" : card.isInnovation ? "Tak" : "Nie";

  return (
    <div className="wrap page">
      <Link to="/radar" className="back" onClick={goBack}>
        &lt; Wróć do kart
      </Link>

      <div className="card-hero">
        <div className="eyebrow">
          {DOMAIN_LABELS[card.domain]} · {shortSourceName(card.source.id, card.source.name)}
        </div>
        <h1>
          {card.title} <BasisChip basis={fb.title} />
        </h1>
        <div className="facts">
          <div className="fact">
            <small>
              Poziom wdrożenia <BasisChip basis={fb.implementationStatus} />
            </small>
            <b>{STATUS_LABELS[card.implementationStatus]}</b>
          </div>
          <div className="fact">
            <small>
              TRL <BasisChip basis={fb.trl} />
            </small>
            <b>{card.trl ?? "nie dotyczy / brak danych"}</b>
          </div>
          <div className="fact">
            <small>
              Dziedzina <BasisChip basis={fb.domain} />
            </small>
            <b>{DOMAIN_LABELS[card.domain]}</b>
          </div>
          <div className="fact">
            <small>
              Innowacja wg Oslo Manual <BasisChip basis={fb.isInnovation} />
            </small>
            <b>{innovationLabel}</b>
          </div>
        </div>
      </div>

      <div className="detail">
        <div>
          <div className="block">
            <h2>
              Opis <BasisChip basis={fb.description} />
            </h2>
            <p>{card.description}</p>
          </div>
          {card.applicationArea && (
            <div className="block">
              <h2>
                Obszar zastosowania <BasisChip basis={fb.applicationArea} />
              </h2>
              <p>{card.applicationArea}</p>
            </div>
          )}
          {card.isInnovationRationale && (
            <div className="block">
              <h2>
                Czy to innowacja? <BasisChip basis={fb.isInnovation} />
              </h2>
              <p>
                <b>{innovationLabel}.</b> {card.isInnovationRationale}
              </p>
            </div>
          )}
          <RecommendationBlock recommendation={card.recommendation} />
          <div className="block">
            <h2>Cytaty ze źródła</h2>
            <p style={{ marginBottom: 14, fontSize: 14 }}>
              Każdy cytat jest automatycznie sprawdzany w pobranym rekordzie. Pole oznaczone jako „Fakt” musi mieć co
              najmniej jeden zweryfikowany cytat.
            </p>
            <EvidenceList evidence={card.evidence} />
          </div>
        </div>

        <aside className="side">
          <section className="panel" aria-labelledby="scores-h" style={{ padding: 0 }}>
            <h3 id="scores-h">Oceny (szacunek AI)</h3>
            <div className="in">
              {SCORE_KEYS.map(({ key, field }) => {
                const s = card.scores[key];
                return (
                  <div key={key} className="score">
                    <div className="score-head">
                      <span>
                        {FIELD_LABELS[field]} <BasisChip basis={fb[field]} />
                      </span>
                      <span className="num">{s.score}/5</span>
                    </div>
                    <ScorePips score={s.score} />
                    <span>{s.rationale}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <SimilarPanel cardId={card.id} />

          <section className="panel" aria-labelledby="src-h" style={{ padding: 0 }}>
            <h3 id="src-h">Źródło</h3>
            <div className="in">
              <dl className="kv">
                <dt>Serwis</dt>
                <dd>{card.source.name}</dd>
                <dt>Pierwsze pobranie</dt>
                <dd>{formatDate(card.source.firstSeenAt)}</dd>
                <dt>Ostatnie pobranie</dt>
                <dd>{formatDateTime(card.source.fetchedAt)}</dd>
              </dl>
              <a className="btn sm" href={card.source.url} target="_blank" rel="noreferrer noopener">
                Otwórz stronę źródła &gt;
              </a>
            </div>
          </section>

          <section className="panel" aria-labelledby="an-h" style={{ padding: 0 }}>
            <h3 id="an-h">Analiza</h3>
            <div className="in">
              <dl className="kv">
                <dt>Model</dt>
                <dd>{card.analysis.model}</dd>
                <dt>Wersja promptu</dt>
                <dd>{card.analysis.promptVersion}</dd>
                <dt>Data analizy</dt>
                <dd>{formatDateTime(card.analyzedAt)}</dd>
              </dl>
              <span>Karta powstała automatycznie. Przed decyzją sprawdź informacje w źródle.</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default CardPage;
