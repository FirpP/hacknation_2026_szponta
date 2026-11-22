import type { FieldBasis } from "@/lib/types/cards.types";
import { BASIS_LABELS } from "@/features/cards/cards.labels";

/** „Fakt” / „Szacunek” przy polu karty; brak wpisu w fieldBasis traktujemy jako szacunek */
const BasisChip = ({ basis }: { basis: FieldBasis | undefined }) => {
  const value: FieldBasis = basis ?? "ESTIMATED";
  const { label, hint } = BASIS_LABELS[value];
  return (
    <span className={`chip ${value === "CONFIRMED" ? "chip-fact" : "chip-est"}`} title={hint}>
      {label}
    </span>
  );
};

export default BasisChip;
