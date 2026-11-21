/**
 * BazTOL (Politechnika Poznańska): katalog technicznych zasobów internetowych.
 * Dostęp: formularz POST akcja=szukanie_proste&wyr_wysz=<słowo> (zweryfikowane 2026-11-21), HTML (cheerio).
 * robots.txt: 404, czyli brak ograniczeń (RFC 9309).
 * Surowy rekord = HTML komórki wyniku (nazwa zasobu, link, opis) + link "Więcej" do strony szczegółów.
 * TODO(verify): stronicowanie wyników (> 1 strony) nie jest obsłużone, bierzemy pierwszą stronę na słowo.
 */
import * as cheerio from "cheerio";
import { RADAR_CONFIG } from "@/radar.config";
import { politeFetch, readFixture } from "./_shared/http";
import { runScraperCli } from "./_shared/cli";
import {
  SkipSourceError,
  type RawItem,
  type ScrapeOptions,
  type ScrapeResult,
  type SourceDefinition,
} from "./_shared/types";

const CONFIG = RADAR_CONFIG.sources.baztol;

export const parseBaztolResults = (html: string, pageUrl: string = CONFIG.url): RawItem[] => {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];

  $("a[onclick*='stat_zasob(']").each((_, el) => {
    const anchor = $(el);
    const id =
      anchor.attr("onclick")?.match(/stat_zasob\((\d+)/)?.[1] ?? anchor.find("span[id^='poz_']").attr("id")?.slice(4);
    if (!id) return;
    const cell = (anchor.closest("td").length > 0 ? anchor.closest("td") : anchor).clone();
    // Atrybuty onclick zawierają adres IP klienta (statystyki BazTOL), więc nie zapisujemy ich w bazie
    cell.find("[onclick]").addBack("[onclick]").removeAttr("onclick");
    items.push({
      externalId: id,
      url: new URL(`/baztol_czytelnik/baztol?id=${id}`, pageUrl).toString(),
      payload: $.html(cell).trim(),
      payloadType: "html",
    });
  });

  return items;
};

const search = async (keyword: string): Promise<RawItem[]> => {
  const body = new URLSearchParams({ akcja: "szukanie_proste", dziedzina_id: "", wyr_wysz: keyword });
  const res = await politeFetch(CONFIG.url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return parseBaztolResults(await res.text());
};

export const run = async ({ limit, offline }: ScrapeOptions): Promise<ScrapeResult> => {
  if (offline) return { items: parseBaztolResults(await readFixture("baztol-search.html")).slice(0, limit) };

  const byId = new Map<string, RawItem>();
  for (const keyword of CONFIG.keywords) {
    if (byId.size >= limit) break;
    try {
      for (const item of await search(keyword)) byId.set(item.externalId, item);
    } catch (error) {
      if (error instanceof SkipSourceError || byId.size === 0) throw error;
      return { items: [...byId.values()].slice(0, limit), partialError: `"${keyword}": ${String(error)}` };
    }
  }
  return { items: [...byId.values()].slice(0, limit) };
};

export const source: SourceDefinition = { id: "baztol", run };

if (import.meta.main) await runScraperCli(source);
