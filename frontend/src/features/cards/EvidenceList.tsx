import type { Evidence } from "@/lib/types/cards.types";
import { FIELD_LABELS, FIELD_ORDER } from "@/features/cards/cards.labels";

/** Cytaty ze źródła pogrupowane po polu karty; „verified” sprawdza backend (cytat musi wystąpić w rekordzie) */
const EvidenceList = ({ evidence }: { evidence: Evidence[] }) => {
  if (evidence.length === 0) return <p>Model nie podał cytatów dla tej karty.</p>;

  const groups = new Map<string, Evidence[]>();
  for (const e of evidence) groups.set(e.field, [...(groups.get(e.field) ?? []), e]);
  const fields = [...groups.keys()].sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a);
    const ib = FIELD_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div>
      {fields.map((field) => (
        <div key={field} className="ev-group">
          <h4>{FIELD_LABELS[field] ?? field}</h4>
          {groups.get(field)!.map((e, i) => (
            <blockquote key={i} className={`quote${e.verified ? "" : " unverified"}`}>
              „{e.quote}”
              <span className="st">
                {e.verified ? "✓ zweryfikowany w źródle" : "⚠ nie znaleziono dosłownie w źródle"}
              </span>
            </blockquote>
          ))}
        </div>
      ))}
    </div>
  );
};

export default EvidenceList;
