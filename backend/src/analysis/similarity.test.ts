import { describe, expect, it } from "bun:test";
import { SimilarityIndex, tokenize } from "./similarity";

const docs = [
  {
    id: 1,
    title: "Wyższa Szkoła Społeczno-Ekonomiczna w Gdańsku Uczelnią Przyjazną",
    description:
      "Projekt dostosowania uczelni do potrzeb osób z niepełnosprawnościami: szkolenia kadr i dostępność budynków.",
    applicationArea: "Szkolnictwo wyższe, dostępność",
  },
  {
    id: 2,
    title: "Wyższa Szkoła Społeczno-Ekonomiczna w Gdańsku – uczelnią przyjazną",
    description: "Dostosowanie uczelni do potrzeb osób z niepełnosprawnościami, dostępność budynków i szkolenia kadr.",
    applicationArea: "Szkolnictwo wyższe",
  },
  {
    id: 3,
    title: "Światłowodowy czujnik odkształceń",
    description: "Czujnik na bazie mikrostrukturalnych światłowodów do monitorowania konstrukcji mostów.",
    applicationArea: "Budownictwo, monitoring konstrukcji",
  },
  {
    id: 4,
    title: "Elektroonline.pl",
    description: "Portal branżowy dla elektryków.",
    applicationArea: null,
  },
  {
    id: 5,
    title: "Elektrosystemy",
    description: "Miesięcznik o systemach zasilania budynków.",
    applicationArea: null,
  },
];

describe("tokenize", () => {
  it("usuwa polskie znaki, krótkie słowa i ujednolica odmianę", () => {
    expect(tokenize("Uczelnią przyjazną w Łodzi")).toEqual(["uczeln", "przyja", "lodzi"]);
    expect(tokenize("uczelnia")).toEqual(tokenize("uczelnią"));
  });
});

describe("SimilarityIndex", () => {
  const index = new SimilarityIndex(docs);

  it("ten sam projekt pod dwoma adresami to możliwy duplikat", () => {
    const [top] = index.findSimilar(1);
    expect(top!.id).toBe(2);
    expect(top!.possibleDuplicate).toBe(true);
  });

  it("niepowiązane karty mają niskie podobieństwo", () => {
    expect(index.similarity(1, 3)).toBeLessThan(0.3);
    expect(index.findSimilar(3).some((h) => h.possibleDuplicate)).toBe(false);
  });

  it("krótkie tytuły o tym samym rdzeniu nie są duplikatami", () => {
    expect(index.titleSimilarity(4, 5)).toBeGreaterThan(0.9);
    expect(index.isPossibleDuplicate(4, 5)).toBe(false);
  });

  it("nie zwraca samej karty, a nieznane id daje pustą listę", () => {
    expect(index.findSimilar(1).map((h) => h.id)).not.toContain(1);
    expect(index.findSimilar(999)).toEqual([]);
  });
});
