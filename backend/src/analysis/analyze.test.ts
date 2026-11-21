import { describe, expect, it } from "bun:test";
import { readFixture } from "@/scrapers/_shared/http";
import { parseNcbr } from "@/scrapers/ncbr";
import { LlmCardSchema } from "./card.schema";
import { isQuoteInSource, buildHaystack, normalizeCard, payloadToText } from "./evidence";

const ncbrPayload = async () => parseNcbr(await readFixture("ncbr.html"))[0]!.payload;

// Przykładowa odpowiedź modelu dla pierwszego rekordu NCBR (czujnik światłowodowy)
const llmResponse = {
  title: "Innowacyjny czujnik odkształceń na bazie specjalnych światłowodów mikrostrukturalnych",
  description: "Projekt LIDER VI dotyczący czujnika odkształceń opartego na światłowodach mikrostrukturalnych.",
  applicationArea: "Inżynieria materiałowa",
  domain: "TECHNOLOGICAL",
  isInnovation: true,
  isInnovationRationale: "Nowe rozwiązanie techniczne.",
  implementationStatus: "PROTOTYPE",
  trl: "5",
  innovation: { score: 4, rationale: "Specjalne światłowody mikrostrukturalne." },
  applicationPotential: { score: "3", rationale: "Monitoring konstrukcji." },
  credibility: { score: 3, rationale: "Strona sukcesów NCBR." },
  evidence: [
    { field: "title", quote: "Innowacyjny czujnik odkształceń na bazie specjalnych światłowodów mikrostrukturalnych" },
    { field: "applicationArea", quote: "Słowa Kluczowe: Inżynieria materiałowa" },
    { field: "implementationStatus", quote: "Prototyp został przetestowany w warunkach przemysłowych" },
  ],
  fieldBasis: {
    title: "CONFIRMED",
    applicationArea: "CONFIRMED",
    implementationStatus: "CONFIRMED",
    trl: "CONFIRMED",
    innovationScore: "CONFIRMED",
  },
};

describe("payloadToText", () => {
  it("zamienia HTML NCBR na czytelne linie bez obrazków", async () => {
    const text = payloadToText(await ncbrPayload(), "html");
    expect(text).toContain("Konkurs\nLIDER VI");
    expect(text).not.toContain("<img");
    expect(text).toContain("(https://www.gov.pl/web/ncbr/innowacyjny-czujnik");
  });
});

describe("isQuoteInSource", () => {
  it("dopasowuje cytat mimo encji HTML, wielkości liter i wielokropka", async () => {
    const haystack = buildHaystack(await ncbrPayload(), "html");
    expect(isQuoteInSource("światłowodów mikrostrukturalnych", haystack)).toBe(true);
    expect(isQuoteInSource("Innowacyjny czujnik … LIDER VI", haystack)).toBe(true);
    expect(isQuoteInSource("rozwiązanie wdrożone w 50 firmach", haystack)).toBe(false);
  });
});

describe("normalizeCard", () => {
  it("koercja typów w schemacie i degradacja niepotwierdzonych pól do ESTIMATED", async () => {
    const card = normalizeCard(LlmCardSchema.parse(llmResponse), await ncbrPayload(), "html");

    expect(card.trl).toBe(5);
    expect(card.applicationPotential.score).toBe(3);
    expect(card.evidence.map((e) => e.verified)).toEqual([true, true, false]);
    expect(card.fieldBasis.title).toBe("CONFIRMED");
    expect(card.fieldBasis.applicationArea).toBe("CONFIRMED"); // cytat ponad podziałem akapitów też się liczy
    expect(card.fieldBasis.implementationStatus).toBe("ESTIMATED"); // cytat zmyślony
    expect(card.fieldBasis.trl).toBe("ESTIMATED"); // źródło nie podaje TRL
    expect(card.fieldBasis.innovationScore).toBe("ESTIMATED"); // oceny zawsze ESTIMATED
    expect(card.fieldBasis.description).toBe("ESTIMATED"); // brak deklaracji => ESTIMATED
  });

  it("odrzuca niepoprawne enumy i oceny spoza skali", () => {
    expect(LlmCardSchema.safeParse({ ...llmResponse, implementationStatus: "DONE" }).success).toBe(false);
    expect(LlmCardSchema.safeParse({ ...llmResponse, innovation: { score: 7, rationale: "x" } }).success).toBe(false);
  });
});
