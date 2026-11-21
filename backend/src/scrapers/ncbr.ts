/**
 * NCBR: "Wyszukiwarka sukcesów beneficjentów" (gov.pl)
 * Dostęp: HTML (cheerio). Wszystkie pozycje (~315) są w jednej statycznej stronie jako <details> w treści artykułu.
 * robots.txt gov.pl: Allow: / (zweryfikowane 2026-11-21).
 * Surowy rekord = outerHTML pojedynczego <details> (tytuł, beneficjent, program, konkurs, kwoty, okres, region, słowa kluczowe)
 * + <article> ze strony szczegółów projektu ("Dowiedz się więcej"): opis problemu, efekty, często informacja o wdrożeniu.
 * Ze strony szczegółów usuwamy tylko obrazki i skrypty. Gdy strona szczegółów jest niedostępna,
 * rekord zawiera samą pozycję z listy, a run ma status PARTIAL.
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

/** Wycina <article> ze strony szczegółów (bez obrazków i skryptów); null, gdy strona ma inną strukturę */
export const extractNcbrDetail = (html: string): string | null => {
  const $ = cheerio.load(html);
  const article = $("article#main-content, article.article-area__article").first();
  if (article.length === 0 || !normalize(article.text())) return null;
  article.find("script,style,noscript,picture,img,svg,.main-photo").remove();
  return $.html(article).trim();
};

/** Surowy rekord = pozycja z listy + (opcjonalnie) artykuł ze strony szczegółów */
export const combineNcbrPayload = (listHtml: string, detailHtml: string | null): string =>
  detailHtml ? `${listHtml}\n<!-- strona szczegółów projektu -->\n${detailHtml}` : listHtml;

const fetchDetailHtml = async (item: RawItem, offline: boolean): Promise<string | null> => {
  if (item.url === CONFIG.url) return null; // pozycja bez linku do szczegółów
  if (offline) {
    try {
      return await readFixture(`ncbr-details/${item.externalId}.html`);
    } catch {
      return null; // fixture tylko dla części rekordów
    }
  }
  return (await politeFetch(item.url)).text();
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
  const selected = all.filter((item) => matchesKeywords(item, CONFIG.keywords)).slice(0, limit);
  if (!CONFIG.fetchDetails) return { items: selected };

  // Strony szczegółów: po jednej na rekord, przez politeFetch (rate limit, robots.txt, retry)
  const failures: string[] = [];
  const items: RawItem[] = [];
  for (const item of selected) {
    let detail: string | null = null;
    try {
      const html = await fetchDetailHtml(item, offline);
      detail = html ? extractNcbrDetail(html) : null;
      if (html && !detail && !offline) failures.push(`${item.externalId}: brak <article> na stronie szczegółów`);
    } catch (error) {
      failures.push(`${item.externalId}: ${error instanceof Error ? error.message : String(error)}`);
    }
    items.push({ ...item, payload: combineNcbrPayload(item.payload, detail) });
  }
  if (failures.length > 0) console.warn(`  ⚠ strony szczegółów niedostępne: ${failures.length}/${selected.length}`);

  return {
    items,
    partialError: failures.length
      ? `Strony szczegółów niedostępne (${failures.length}/${selected.length}): ${failures.slice(0, 3).join("; ")}`
      : undefined,
  };
};

export const source: SourceDefinition = { id: "ncbr", run };

if (import.meta.main) await runScraperCli(source);
