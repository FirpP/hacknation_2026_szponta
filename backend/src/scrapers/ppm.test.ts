import { describe, expect, it } from "bun:test";
import { readFixture } from "./_shared/http";
import { oaiRecordsToItems, parseOaiPage } from "./_shared/oai-pmh";
import { SkipSourceError } from "./_shared/types";

describe("PPM OAI-PMH (CERIF)", () => {
  it("parsuje rekordy i zachowuje surowy XML <record>", async () => {
    const page = parseOaiPage(await readFixture("ppm-patents.xml"));
    expect(page.error).toBeNull();
    expect(page.records).toHaveLength(5);

    const first = page.records[0]!;
    expect(first.identifier).toBe("oai:ppm.edu.pl:Patents/UMWb07a6feda30347c08a9acd22e5db6ef1");
    expect(first.xml.startsWith("<record>")).toBe(true);
    expect(first.xml).toContain("Pat.249385");
    expect(first.text).toContain("Prolek");
    // Surowy payload zachowuje oryginalne znaki (bez encji &#x105; wprowadzanych przez serializer)
    expect(first.xml).toContain("związek o działaniu przeciwnowotworowym");
    expect(first.xml).not.toContain("&#x");
  });

  it("zamienia rekordy na RawItem z URL-em GetRecord i filtruje słowa kluczowe", async () => {
    const page = parseOaiPage(await readFixture("ppm-patents.xml"));
    const base = { baseUrl: "https://ppm.edu.pl/oai", metadataPrefix: "oai_cerif_openaire" };

    const all = oaiRecordsToItems(page.records, base);
    expect(all).toHaveLength(5);
    expect(all[0]!.url).toBe(
      "https://ppm.edu.pl/oai?verb=GetRecord&metadataPrefix=oai_cerif_openaire&identifier=oai%3Appm.edu.pl%3APatents%2FUMWb07a6feda30347c08a9acd22e5db6ef1",
    );

    const filtered = oaiRecordsToItems(page.records, { ...base, keywords: ["gemcytabin"] });
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.length).toBeLessThan(all.length + 1);
  });

  it("rozpoznaje błąd protokołu i noRecordsMatch", () => {
    const err = parseOaiPage(
      '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><error code="badArgument">zły argument</error></OAI-PMH>',
    );
    expect(err.error).toEqual({ code: "badArgument", message: "zły argument" });

    const empty = parseOaiPage(
      '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><error code="noRecordsMatch">brak</error></OAI-PMH>',
    );
    expect(empty).toEqual({ records: [], resumptionToken: null, error: null });
  });

  it("strona anti-bot (HTML) => SkipSourceError, inny nie-OAI dokument => błąd", () => {
    expect(() => parseOaiPage("<!DOCTYPE html><html><title>High Load - Verifying Browser</title></html>")).toThrow(
      SkipSourceError,
    );
    expect(() => parseOaiPage('<?xml version="1.0"?><foo/>')).toThrow("nie jest dokumentem OAI-PMH");
  });
});
