/**
 * NCBR: "Wyszukiwarka sukcesów beneficjentów" (gov.pl)
 * Dostęp: HTML (cheerio). Wszystkie pozycje (~315) są w jednej statycznej stronie jako <details> w treści artykułu.
 * robots.txt gov.pl: Allow: / (zweryfikowane 2026-11-21).
 * Surowy rekord = outerHTML pojedynczego <details> (tytuł, beneficjent, program, konkurs, kwoty, okres, region, słowa kluczowe).
 */
import * as cheerio from "cheerio";
import { RADAR_CONFIG } from "@/radar.config";
import { politeFetch, readFixture } from "./_shared/http";
import { runScraperCli } from "./_shared/cli";
import { sha256 } from "./_shared/persist";
import type { RawItem, ScrapeOptions, ScrapeResult, SourceDefinition } from "./_shared/types";

const CONFIG = RADAR_CONFIG.sources.ncbr;

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export const parseNcbr = (html: string, pageUrl: string = CONFIG.url): RawItem[] => {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];

  $("article .editor-content details").each((_, el) => {
    const details = $(el);
    const title = normalize(details.children("summary").first().text());
    if (!title) return;
    const href = details.find("a[href*='/web/ncbr/']").last().attr("href");
    const url = href ? new URL(href, pageUrl).toString() : pageUrl;
    // Slug strony szczegółów jest stabilny; bez linku używamy skrótu tytułu
    const externalId = href
      ? new URL(url).pathname.split("/").filter(Boolean).pop()!
      : `title-${sha256(title).slice(0, 16)}`;
    items.push({ externalId, url, payload: $.html(details), payloadType: "html" });
  });

  return items;
};

const matchesKeywords = (item: RawItem, keywords: readonly string[]) => {
  if (keywords.length === 0) return true;
  const text = cheerio.load(item.payload).text().toLowerCase();
  return keywords.some((k) => text.includes(k.toLowerCase()));
};

export const run = async ({ limit, offline }: ScrapeOptions): Promise<ScrapeResult> => {
  const html = offline ? await readFixture("ncbr.html") : await (await politeFetch(CONFIG.url)).text();
  const all = parseNcbr(html);
  if (all.length === 0) {
    throw new Error("Nie znaleziono żadnej pozycji (article .editor-content details): zmieniła się struktura strony?");
  }
  const items = all.filter((item) => matchesKeywords(item, CONFIG.keywords)).slice(0, limit);
  return { items };
};

export const source: SourceDefinition = { id: "ncbr", run };

if (import.meta.main) await runScraperCli(source);
