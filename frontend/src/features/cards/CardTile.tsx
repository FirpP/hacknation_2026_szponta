import { Link } from "react-router-dom";
import type { CardSummary } from "@/lib/types/cards.types";
import { DOMAIN_LABELS, STATUS_LABELS, shortSourceName } from "@/features/cards/cards.labels";
import ScorePips from "@/features/cards/ScorePips";

const CardTile = ({ card }: { card: CardSummary }) => (
  <Link to={`/karty/${card.id}`} className="tile">
    <div className="tile-top">
      <span>{DOMAIN_LABELS[card.domain]}</span>
      <span>{card.trl ? `TRL ${card.trl}` : "TRL –"}</span>
    </div>
    <div className="tile-body">
      <h3>{card.title}</h3>
      <div className="tile-meta">
        <span className="badge solid">{STATUS_LABELS[card.implementationStatus]}</span>
        {card.isInnovation === false && <span className="badge">nie spełnia definicji innowacji</span>}
      </div>
      <p>{card.description}</p>
      <div className="tile-scores">
        <div className="score-row">
          Innowacyjność <ScorePips score={card.scores.innovation.score} />
        </div>
        <div className="score-row">
          Potencjał zastosowania <ScorePips score={card.scores.applicationPotential.score} />
        </div>
        <div className="score-row">
          Wiarygodność <ScorePips score={card.scores.credibility.score} />
        </div>
        <span className="tile-src">
          Źródło: {shortSourceName(card.source.id, card.source.name)} · oceny to szacunek AI
        </span>
      </div>
    </div>
  </Link>
);

export default CardTile;
