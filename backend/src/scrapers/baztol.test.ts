import { describe, expect, it } from "bun:test";
import { readFixture } from "./_shared/http";
import { parseBaztolResults } from "./baztol";

describe("parseBaztolResults", () => {
  it("wycina wynik wyszukiwania jako surowy HTML komórki z id zasobu", async () => {
    const items = parseBaztolResults(await readFixture("baztol-search.html"));

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.externalId).toBe("530");
    expect(item.url).toBe("http://baztol.library.put.poznan.pl/baztol_czytelnik/baztol?id=530");
    expect(item.payloadType).toBe("html");
    expect(item.payload).toContain("KoNaR Koło Naukowe Robotyków");
    expect(item.payload).toContain("http://www.konar.pwr.wroc.pl/");
    expect(item.payload).not.toContain("onclick");
  });
});
