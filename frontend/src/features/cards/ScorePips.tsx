/** Ocena 1–5 jako pięć kresek; liczba w aria-label i obok, nie tylko kolorem */
const ScorePips = ({ score }: { score: number }) => (
  <span className="pips" role="img" aria-label={`${score} na 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <i key={n} className={n <= score ? "on" : undefined} />
    ))}
  </span>
);

export default ScorePips;
