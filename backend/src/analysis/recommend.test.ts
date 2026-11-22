import { describe, expect, it } from "bun:test";
import { recommend, type RecommendInput } from "./recommend";

const card = (over: Partial<RecommendInput> = {}): RecommendInput => ({
  domain: "TECHNOLOGICAL",
  implementationStatus: "PROTOTYPE",
  trl: null,
  isInnovation: true,
  innovationScore: 3,
  applicationPotentialScore: 3,
  credibilityScore: 3,
  ...over,
});

describe("recommend", () => {
  it("nie-innowacja: brak ścieżki i odbiorców", () => {
    const r = recommend(card({ isInnovation: false, implementationStatus: "IN_USE", innovationScore: 5 }));
    expect(r.path).toBe("NOT_APPLICABLE");
    expect(r.audiences).toEqual([]);
    expect(r.metrics).toEqual([]);
  });

  it("wdrożona technologia o wysokiej innowacyjności -> komercjalizacja dla inwestorów i firm", () => {
    const r = recommend(card({ implementationStatus: "IN_USE", innovationScore: 4 }));
    expect(r.path).toBe("COMMERCIALIZATION");
    expect(r.audiences).toEqual(["INVESTORS", "STARTUPS_COMPANIES"]);
    expect(r.reasons).toContain("innowacyjność 4/5 ≥ 4");
    expect(r.metrics.length).toBeGreaterThan(0);
    expect(r.basis).toBe("ESTIMATED");
  });

  it("TRL ≥ 7 wystarcza do komercjalizacji bez potwierdzonego wdrożenia", () => {
    expect(recommend(card({ trl: 7, innovationScore: 4 })).path).toBe("COMMERCIALIZATION");
  });

  it("stosowane rozwiązanie edukacyjne z potencjałem -> transfer do szkół, uczelni i instytucji", () => {
    const r = recommend(card({ domain: "EDUCATIONAL", implementationStatus: "IN_USE", applicationPotentialScore: 4 }));
    expect(r.path).toBe("TRANSFER");
    expect(r.audiences).toEqual(["PUBLIC_INSTITUTIONS", "UNIVERSITIES", "SCHOOLS"]);
  });

  it("prototyp -> pilotaż", () => {
    expect(recommend(card({ implementationStatus: "PROTOTYPE", trl: 5 })).path).toBe("PILOT");
  });

  it("koncepcja -> dalsze B+R z uczelniami", () => {
    const r = recommend(card({ implementationStatus: "CONCEPT", trl: 2 }));
    expect(r.path).toBe("FURTHER_RND");
    expect(r.reasons).toContain("TRL 2 ≤ 3");
    expect(r.audiences).toContain("UNIVERSITIES");
  });

  it("brak statusu i TRL -> szukanie partnera", () => {
    const r = recommend(card({ implementationStatus: "UNKNOWN" }));
    expect(r.path).toBe("FIND_PARTNER");
    expect(r.reasons).toContain("źródło nie podaje statusu wdrożenia");
  });

  it("wdrożone, ale niski potencjał zastosowania gdzie indziej -> szukanie partnera", () => {
    const r = recommend(
      card({ domain: "ADMINISTRATIVE", implementationStatus: "IN_USE", applicationPotentialScore: 2 }),
    );
    expect(r.path).toBe("FIND_PARTNER");
    expect(r.audiences).toContain("PUBLIC_INSTITUTIONS");
  });
});
