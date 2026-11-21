import { describe, expect, it } from "bun:test";
import { readFixture } from "./_shared/http";
import { extractNcbrDetail, parseNcbr, run } from "./ncbr";

describe("parseNcbr", () => {
  it("wycina każdą pozycję <details> jako surowy rekord HTML", async () => {
    const items = parseNcbr(await readFixture("ncbr.html"));

    expect(items).toHaveLength(8);
    const first = items[0]!;
    expect(first.externalId).toBe(
      "innowacyjny-czujnik-odksztalcen-na-bazie-specjalnych-swiatlowodow-mikrostrukturalnych",
    );
    expect(first.url).toBe(
      "https://www.gov.pl/web/ncbr/innowacyjny-czujnik-odksztalcen-na-bazie-specjalnych-swiatlowodow-mikrostrukturalnych",
    );
    expect(first.payloadType).toBe("html");
    expect(first.payload.startsWith("<details>")).toBe(true);
    expect(first.payload).toContain("LIDER VI");
  });

  it("ma unikalne externalId (idempotentny upsert)", async () => {
    const items = parseNcbr(await readFixture("ncbr.html"));
    expect(new Set(items.map((i) => i.externalId)).size).toBe(items.length);
  });

  it("zwraca pustą listę dla strony bez pozycji", () => {
    expect(parseNcbr("<html><body><article></article></body></html>")).toEqual([]);
  });
});

const CZUJNIK = "innowacyjny-czujnik-odksztalcen-na-bazie-specjalnych-swiatlowodow-mikrostrukturalnych";

describe("strona szczegółów NCBR", () => {
  it("wycina <article> z opisem efektów, bez obrazków", async () => {
    const detail = extractNcbrDetail(await readFixture(`ncbr-details/${CZUJNIK}.html`));

    expect(detail).not.toBeNull();
    expect(detail!.startsWith("<article")).toBe(true);
    expect(detail).toContain("Zobacz efekt naszej pracy");
    expect(detail).toContain("Jaki problem rozwiązuje nasz projekt?");
    expect(detail).not.toContain("<img");
  });

  it("zwraca null dla strony bez artykułu", () => {
    expect(extractNcbrDetail("<html><body><p>Błąd</p></body></html>")).toBeNull();
  });

  it("offline: dokleja szczegóły tam, gdzie jest fixture, reszta zostaje z samej listy", async () => {
    const { items, partialError } = await run({ limit: 3, offline: true });

    expect(partialError).toBeUndefined();
    expect(items).toHaveLength(3);
    const czujnik = items.find((i) => i.externalId === CZUJNIK)!;
    expect(czujnik.payload.startsWith("<details>")).toBe(true);
    expect(czujnik.payload).toContain("<!-- strona szczegółów projektu -->");
    expect(czujnik.payload).toContain("Zobacz efekt naszej pracy");

    const bezFixture = items.find((i) => i.externalId !== CZUJNIK && !i.externalId.startsWith("opracowanie-"))!;
    expect(bezFixture.payload).not.toContain("strona szczegółów projektu");
  });
});
