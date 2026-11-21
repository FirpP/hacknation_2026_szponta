import { describe, expect, it } from "bun:test";
import { Step1BodySchema } from "@api/form/validators/form.validator";

const valid = {
  institution: "  Politechnika Rzeszowska ",
  instType: "UNIVERSITY",
  countyId: 24,
  contactName: "dr Piotr Gąsior",
  contactEmail: "p.gasior@example.com",
  creators: [{ name: "Karol Wiśniewski", role: "lider zespołu" }, { name: "Natalia Szpak" }],
  isYouthInitiative: true,
};

describe("Step1BodySchema", () => {
  it("powinien przyjąć poprawne dane i przyciąć spacje", () => {
    const result = Step1BodySchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.data?.institution).toBe("Politechnika Rzeszowska");
  });

  it("powinien przyjąć pustą listę twórców", () => {
    expect(Step1BodySchema.safeParse({ ...valid, creators: [] }).success).toBe(true);
  });

  it.each([
    ["pusta instytucja", { institution: "   " }],
    ["nieznany typ instytucji", { instType: "Szkoła" }],
    ["countyId jako tekst", { countyId: "24" }],
    ["countyId ujemny", { countyId: -1 }],
    ["countyId ułamkowy", { countyId: 1.5 }],
    ["zły e-mail", { contactEmail: "nie-email" }],
    ["pusta osoba kontaktowa", { contactName: "" }],
    ["twórca bez imienia", { creators: [{ name: " " }] }],
    ["więcej niż 10 twórców", { creators: Array.from({ length: 11 }, (_, k) => ({ name: `Twórca ${k}` })) }],
    ["brak isYouthInitiative", { isYouthInitiative: undefined }],
  ])("powinien odrzucić: %s", (_label, patch) => {
    expect(Step1BodySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});
