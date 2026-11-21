import { describe, expect, it } from "bun:test";
import { readFixture } from "./_shared/http";
import { parseNcbr } from "./ncbr";

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
