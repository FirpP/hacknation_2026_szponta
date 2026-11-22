import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CardSummary, Domain, ImplementationStatus } from "@/lib/types/cards.types";
import { DOMAIN_LABELS, STATUS_LABELS } from "@/features/cards/cards.labels";

const SIZE = 680;
const C = SIZE / 2;
const DOT_R = 5;
const STEP = 14; // odstęp między środkami kropek

/** Pierścienie od środka: im bliżej środka, tym dalej posunięte wdrożenie. IN_USE ma najszerszy pas, bo jest najliczniejszy */
const RINGS: { status: ImplementationStatus; r0: number; r1: number }[] = [
  { status: "IN_USE", r0: 36, r1: 136 },
  { status: "PILOT", r0: 136, r1: 176 },
  { status: "TESTING", r0: 176, r1: 216 },
  { status: "PROTOTYPE", r0: 216, r1: 260 },
  { status: "CONCEPT", r0: 260, r1: 290 },
  { status: "UNKNOWN", r0: 290, r1: 318 },
];

/** Ćwiartki zgodnie z ruchem wskazówek zegara od góry */
const SECTORS: Domain[] = ["TECHNOLOGICAL", "EDUCATIONAL", "ADMINISTRATIVE", "OTHER"];
const PAD = 0.06; // margines kątowy przy osiach (rad)

/** Skala sekwencyjna PCI (jeden odcień, jasny → ciemny) dla innowacyjności 1–5 */
const SCORE_COLORS: { label: string; color: string; test: (s: number) => boolean }[] = [
  { label: "5 – bardzo wysoka", color: "#001a49", test: (s) => s >= 5 },
  { label: "4 – wysoka", color: "#035487", test: (s) => s === 4 },
  { label: "3 – średnia", color: "#5a8fb4", test: (s) => s === 3 },
  { label: "1–2 – niska", color: "#a9c4d8", test: (s) => s <= 2 },
];
const scoreColor = (s: number) => SCORE_COLORS.find((c) => c.test(s))?.color ?? "#a9c4d8";

const polar = (r: number, angle: number) => ({ x: C + r * Math.sin(angle), y: C - r * Math.cos(angle) });

const arcPath = (r0: number, r1: number, a0: number, a1: number) => {
  const p0 = polar(r1, a0);
  const p1 = polar(r1, a1);
  const p2 = polar(r0, a1);
  const p3 = polar(r0, a0);
  return `M${p0.x} ${p0.y} A${r1} ${r1} 0 0 1 ${p1.x} ${p1.y} L${p2.x} ${p2.y} A${r0} ${r0} 0 0 0 ${p3.x} ${p3.y}Z`;
};

type Placed = { card: CardSummary; x: number; y: number };

/**
 * Rozkład deterministyczny: w każdej komórce (dziedzina × status) kropki idą rzędami po łukach,
 * wewnętrzne rzędy dostają karty o wyższej innowacyjności. Bez losowości, więc układ nie skacze przy odświeżeniu.
 */
const layout = (cards: CardSummary[]): Placed[] => {
  const placed: Placed[] = [];
  SECTORS.forEach((domain, si) => {
    const a0 = (si * Math.PI) / 2 + PAD;
    const a1 = ((si + 1) * Math.PI) / 2 - PAD;
    const span = a1 - a0;
    for (const ring of RINGS) {
      const cell = cards
        .filter((c) => c.domain === domain && c.implementationStatus === ring.status)
        .sort((a, b) => b.scores.innovation.score - a.scores.innovation.score || a.id - b.id);
      if (cell.length === 0) continue;

      const rows: { r: number; cap: number }[] = [];
      for (let r = ring.r0 + STEP / 2 + 1; r <= ring.r1 - STEP / 2 + 0.5; r += STEP) {
        rows.push({ r, cap: Math.max(1, Math.floor((r * span) / STEP)) });
      }
      if (rows.length === 0) rows.push({ r: (ring.r0 + ring.r1) / 2, cap: 1 });
      const totalCap = rows.reduce((s, row) => s + row.cap, 0);

      // Ile kropek na rząd: proporcjonalnie do pojemności; nadmiar (gdy komórka przepełniona) trafia do rzędów zewnętrznych
      let left = cell.length;
      const counts = rows.map((row, i) => {
        const n = i === rows.length - 1 ? left : Math.min(left, Math.round((cell.length * row.cap) / totalCap));
        left -= n;
        return n;
      });

      let idx = 0;
      rows.forEach((row, i) => {
        const n = counts[i] ?? 0;
        for (let k = 0; k < n; k++) {
          const card = cell[idx++];
          if (!card) return;
          const { x, y } = polar(row.r, a0 + (span * (k + 0.5)) / n);
          placed.push({ card, x, y });
        }
      });
    }
  });
  return placed;
};

const CORNERS: Record<Domain, { x: number; y: number; anchor: "start" | "end" }> = {
  TECHNOLOGICAL: { x: SIZE - 4, y: 18, anchor: "end" },
  EDUCATIONAL: { x: SIZE - 4, y: SIZE - 8, anchor: "end" },
  ADMINISTRATIVE: { x: 4, y: SIZE - 8, anchor: "start" },
  OTHER: { x: 4, y: 18, anchor: "start" },
};

type Props = { cards: CardSummary[]; total: number };

const RadarChart = ({ cards, total }: Props) => {
  const placed = useMemo(() => layout(cards), [cards]);
  const [active, setActive] = useState<CardSummary | null>(null);
  const counts = useMemo(() => {
    const m = new Map<Domain, number>();
    for (const c of cards) m.set(c.domain, (m.get(c.domain) ?? 0) + 1);
    return m;
  }, [cards]);

  return (
    <div className="radar-box">
      <svg
        className="radar-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Radar innowacji: ${cards.length} kart rozmieszczonych według dziedziny i poziomu wdrożenia`}
      >
        {/* pierścienie: naprzemienne tło, linie włosowe */}
        {RINGS.map((ring, i) => (
          <path
            key={ring.status}
            d={arcPath(ring.r0, ring.r1, 0, Math.PI * 2 - 0.0001)}
            fill={i % 2 === 0 ? "#f5f7f9" : "#ffffff"}
            stroke="#e3e6ea"
            strokeWidth="1"
          />
        ))}
        <circle cx={C} cy={C} r={RINGS[0]!.r0} fill="#ffffff" stroke="#e3e6ea" />
        <line x1={C} y1={C - 318} x2={C} y2={C + 318} stroke="#c9d1d9" strokeWidth="1" />
        <line x1={C - 318} y1={C} x2={C + 318} y2={C} stroke="#c9d1d9" strokeWidth="1" />
        <circle cx={C} cy={C} r="4" fill="#7ab929" />

        {/* nazwy ćwiartek z liczbą kart */}
        <g fontFamily="Lato,sans-serif" fontSize="14" fontWeight="700" fill="#001a49">
          {SECTORS.map((d) => (
            <text key={d} x={CORNERS[d].x} y={CORNERS[d].y} textAnchor={CORNERS[d].anchor}>
              {DOMAIN_LABELS[d]} · {counts.get(d) ?? 0}
            </text>
          ))}
        </g>

        {placed.map(({ card, x, y }) => (
          <Link
            key={card.id}
            to={`/karty/${card.id}`}
            className="dot"
            aria-label={`${card.title}: ${STATUS_LABELS[card.implementationStatus]}, innowacyjność ${card.scores.innovation.score}/5`}
            onMouseEnter={() => setActive(card)}
            onFocus={() => setActive(card)}
          >
            {/* obszar trafienia większy niż kropka */}
            <circle cx={x} cy={y} r={DOT_R + 4} fill="transparent" />
            <circle
              className="mark"
              cx={x}
              cy={y}
              r={DOT_R}
              fill={scoreColor(card.scores.innovation.score)}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </Link>
        ))}
        {/* podpisy pierścieni nad kropkami, z białą obwódką dla czytelności */}
        <g
          fontFamily="Lato,sans-serif"
          fontSize="10.5"
          fontWeight="700"
          fill="#6f6f6f"
          stroke="#ffffff"
          strokeWidth="3"
          paintOrder="stroke"
          pointerEvents="none"
        >
          {RINGS.map((ring) => (
            <text key={ring.status} x={C + 4} y={C - (ring.r0 + ring.r1) / 2 + 3.5}>
              {STATUS_LABELS[ring.status]}
            </text>
          ))}
        </g>
      </svg>

      <aside className="legend">
        <h4>Kolor: innowacyjność (szacunek AI)</h4>
        <ul>
          {SCORE_COLORS.map((c) => (
            <li key={c.label}>
              <span className="sw" style={{ background: c.color }} />
              {c.label}
            </li>
          ))}
        </ul>
        <h4>Położenie</h4>
        <ul>
          <li>Ćwiartka = dziedzina</li>
          <li>Bliżej środka = dalej posunięte wdrożenie</li>
        </ul>
        <div className="radar-tip" aria-live="polite">
          {active ? (
            <>
              <b>{active.title}</b>
              {DOMAIN_LABELS[active.domain]} · {STATUS_LABELS[active.implementationStatus]}
              {active.trl ? ` · TRL ${active.trl}` : ""}
              <br />
              Innowacyjność {active.scores.innovation.score}/5 · potencjał {active.scores.applicationPotential.score}/5
              · wiarygodność {active.scores.credibility.score}/5
              <br />
              <span className="muted">Kliknij kropkę, aby otworzyć kartę.</span>
            </>
          ) : (
            <span className="muted">Najedź na kropkę albo przejdź do niej klawiszem Tab, aby zobaczyć kartę.</span>
          )}
        </div>
        {total > cards.length && (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            Pokazano {cards.length} z {total} kart (do 100 najwyżej ocenionych w każdej dziedzinie). Zawęź filtry, aby
            zobaczyć resztę.
          </p>
        )}
      </aside>
    </div>
  );
};

export default RadarChart;
