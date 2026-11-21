import { z } from "zod";

export const IMPLEMENTATION_STATUSES = ["CONCEPT", "PROTOTYPE", "TESTING", "PILOT", "IN_USE", "UNKNOWN"] as const;
export const DOMAINS = ["TECHNOLOGICAL", "EDUCATIONAL", "ADMINISTRATIVE", "OTHER"] as const;
export const FIELD_BASIS = ["CONFIRMED", "ESTIMATED"] as const;

/** Pola karty, dla których podajemy pochodzenie (fakt ze źródła vs szacunek modelu) */
export const CARD_FIELDS = [
  "title",
  "description",
  "applicationArea",
  "domain",
  "isInnovation",
  "implementationStatus",
  "trl",
  "innovationScore",
  "applicationPotentialScore",
  "credibilityScore",
] as const;
export type CardField = (typeof CARD_FIELDS)[number];
export type FieldBasis = (typeof FIELD_BASIS)[number];

/** Pola, które z natury są oceną modelu: zawsze ESTIMATED */
export const ALWAYS_ESTIMATED: readonly CardField[] = [
  "isInnovation",
  "innovationScore",
  "applicationPotentialScore",
  "credibilityScore",
];

const nullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const ScoreSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  rationale: z.string().trim().min(1).max(600),
});

/** Odpowiedź modelu (JSON). Walidowana przed zapisem, a przy błędzie następuje 1 retry z komunikatem. */
export const LlmCardSchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().min(10).max(1500),
  applicationArea: nullableString(300),
  domain: z.enum(DOMAINS),
  isInnovation: z
    .boolean()
    .nullish()
    .transform((v) => v ?? null),
  isInnovationRationale: nullableString(600),
  implementationStatus: z.enum(IMPLEMENTATION_STATUSES),
  trl: z
    .union([z.coerce.number().int().min(1).max(9), z.null()])
    .optional()
    .transform((v) => v ?? null),
  innovation: ScoreSchema,
  applicationPotential: ScoreSchema,
  credibility: ScoreSchema,
  evidence: z
    .array(z.object({ field: z.string().trim().min(1), quote: z.string().trim().min(1).max(600) }))
    .max(25)
    .default([]),
  fieldBasis: z.record(z.string(), z.enum(FIELD_BASIS)).default({}),
});
export type LlmCard = z.infer<typeof LlmCardSchema>;

export type EvidenceItem = { field: string; quote: string; verified: boolean };

/** Karta po normalizacji, gotowa do zapisu w InnovationCard */
export type NormalizedCard = Omit<LlmCard, "evidence" | "fieldBasis"> & {
  evidence: EvidenceItem[];
  fieldBasis: Record<CardField, FieldBasis>;
};
