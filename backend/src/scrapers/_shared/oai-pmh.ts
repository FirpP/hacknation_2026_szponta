/**
 * Klient OAI-PMH 2.0: ListRecords z resumptionToken, limit, filtr słów kluczowych.
 * Surowy rekord = cały element <record> (XML) bez interpretacji metadanych.
 */
import * as cheerio from "cheerio";
import { politeFetch } from "./http";
import { SkipSourceError, type RawItem, type ScrapeResult } from "./types";

export type OaiRecord = { identifier: string; datestamp: string; deleted: boolean; xml: string; text: string };
export type OaiPage = {
  records: OaiRecord[];
  resumptionToken: string | null;
  error: { code: string; message: string } | null;
};

/** Przy decodeEntities: false cheerio nie dekoduje encji w .text(), więc robimy to sami (tylko pola tekstowe) */
const decodeXmlEntities = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export const parseOaiPage = (xml: string): OaiPage => {
  if (/^\s*<(!doctype\s+html|html)/i.test(xml)) {
    // Np. weryfikacja anti-bot (PAN): nie obchodzimy zabezpieczeń, źródło jest świadomie pomijane
    throw new SkipSourceError("Serwer zwrócił stronę HTML (np. weryfikację anti-bot) zamiast odpowiedzi OAI-PMH");
  }
  // decodeEntities: false => $.xml() zachowuje oryginalny tekst (polskie znaki zamiast &#x105;)
  const $ = cheerio.load(xml, { xml: { decodeEntities: false } });
  const text = (node: ReturnType<typeof $>) => decodeXmlEntities(node.text()).trim();
  if ($("OAI-PMH").length === 0) throw new Error("Odpowiedź nie jest dokumentem OAI-PMH");
  const error = $("OAI-PMH > error").first();
  if (error.length > 0) {
    const code = error.attr("code") ?? "unknown";
    // noRecordsMatch to poprawna pusta odpowiedź, nie błąd
    if (code === "noRecordsMatch") return { records: [], resumptionToken: null, error: null };
    return { records: [], resumptionToken: null, error: { code, message: text(error) } };
  }

  const records: OaiRecord[] = [];
  $("ListRecords > record").each((_, el) => {
    const record = $(el);
    const header = record.children("header").first();
    records.push({
      identifier: text(header.children("identifier")),
      datestamp: text(header.children("datestamp")),
      deleted: header.attr("status") === "deleted",
      xml: $.xml(record),
      text: text(record.children("metadata")).replace(/\s+/g, " "),
    });
  });

  const token = text($("ListRecords > resumptionToken").first());
  return { records, resumptionToken: token || null, error: null };
};

export type HarvestOptions = {
  baseUrl: string;
  metadataPrefix: string;
  set?: string;
  from?: string;
  limit: number;
  keywords?: readonly string[];
  minDelayMs?: number;
  /** Bezpiecznik na wypadek pustych stron z tokenem (PPM tak robi) */
  maxPages?: number;
  /** URL rekordu; domyślnie GetRecord tego samego repozytorium (zawsze poprawny wg protokołu) */
  recordUrl?: (record: OaiRecord) => string;
};

const getRecordUrl = (baseUrl: string, metadataPrefix: string, identifier: string) =>
  `${baseUrl}?${new URLSearchParams({ verb: "GetRecord", metadataPrefix, identifier })}`;

/** Zamienia stronę OAI na RawItem z filtrem słów kluczowych (wspólne dla trybu online i offline) */
export const oaiRecordsToItems = (
  records: OaiRecord[],
  opts: Pick<HarvestOptions, "baseUrl" | "metadataPrefix" | "keywords" | "recordUrl">,
): RawItem[] => {
  const keywords = (opts.keywords ?? []).map((k) => k.toLowerCase());
  return records
    .filter((r) => !r.deleted && r.identifier)
    .filter((r) => keywords.length === 0 || keywords.some((k) => r.text.toLowerCase().includes(k)))
    .map((r) => ({
      externalId: r.identifier,
      url: opts.recordUrl?.(r) ?? getRecordUrl(opts.baseUrl, opts.metadataPrefix, r.identifier),
      payload: r.xml,
      payloadType: "xml" as const,
    }));
};

export const harvest = async (opts: HarvestOptions): Promise<ScrapeResult> => {
  const items: RawItem[] = [];
  const maxPages = opts.maxPages ?? 20;
  let token: string | null = null;

  for (let page = 0; page < maxPages && items.length < opts.limit; page++) {
    const params = new URLSearchParams({ verb: "ListRecords" });
    if (token) {
      params.set("resumptionToken", token);
    } else {
      params.set("metadataPrefix", opts.metadataPrefix);
      if (opts.set) params.set("set", opts.set);
      if (opts.from) params.set("from", opts.from);
    }

    let parsed: OaiPage;
    try {
      const res = await politeFetch(`${opts.baseUrl}?${params}`, { minDelayMs: opts.minDelayMs });
      parsed = parseOaiPage(await res.text());
    } catch (error) {
      // Pierwsza strona (albo świadome pominięcie): błąd całego runa; kolejne: PARTIAL z tym, co już mamy
      if (items.length === 0 || error instanceof SkipSourceError) throw error;
      return { items, partialError: error instanceof Error ? error.message : String(error) };
    }
    if (parsed.error) {
      const message = `OAI-PMH ${parsed.error.code}: ${parsed.error.message}`;
      if (items.length === 0) throw new Error(message);
      return { items, partialError: message };
    }

    items.push(...oaiRecordsToItems(parsed.records, opts));
    token = parsed.resumptionToken;
    if (!token) break;
  }

  return { items: items.slice(0, opts.limit) };
};
