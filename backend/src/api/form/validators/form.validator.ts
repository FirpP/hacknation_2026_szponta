import { z } from "zod";
import { InstitutionType } from "../../../../prisma/generated/enums";

// meta.ref - schemat trafia do components.schemas w specu OpenAPI (i do typów frontu po bun run gen:api)

export const CreatorSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: z.string().trim().max(100).optional(),
  })
  .meta({ ref: "FormCreator", description: "Twórca inicjatywy (imię i nazwisko oraz opcjonalna rola)" });

// Krok 1 formularza: "Kto zgłasza". Wartości instType to klucze enuma z Prismy (np. SCHOOL), etykiety po polsku mapuje front.
export const Step1BodySchema = z
  .object({
    institution: z.string().trim().min(1).max(200),
    instType: z.enum(InstitutionType),
    countyId: z.int().positive(),
    contactName: z.string().trim().min(1).max(100),
    contactEmail: z.email().max(254),
    creators: z.array(CreatorSchema).max(10),
    isYouthInitiative: z.boolean(),
  })
  .meta({ ref: "FormStep1Body", description: "Dane kroku 1 formularza zgłoszenia: kto zgłasza" });
export type Step1Body = z.infer<typeof Step1BodySchema>;

export const StepValidationResponseSchema = z
  .object({ valid: z.literal(true) })
  .meta({ ref: "FormStepValidation", description: "Dane kroku są poprawne, można przejść do kolejnego" });
