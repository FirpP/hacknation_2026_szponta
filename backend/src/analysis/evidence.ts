/**
 * Przejrzystość karty: weryfikacja cytatów i pochodzenia pól w kodzie, nie tylko w prompcie.
 * - cytat jest "verified", gdy występuje w surowym rekordzie (po normalizacji spacji, encji, cudzysłowów)
 * - pole może być CONFIRMED tylko wtedy, gdy ma zweryfikowany cytat; inaczej jest degradowane do ESTIMATED
 * - oceny 1-5 i isInnovation są zawsze ESTIMATED; TRL jest CONFIRMED tylko z cytatem zawierającym "TRL"
 */
import * as cheerio from "cheerio";
import type { PayloadType } from "@/scrapers/_shared/types";
import {
  ALWAYS_ESTIMATED,
  CARD_FIELDS,
  type CardField,
  type EvidenceItem,
  type FieldBasis,
  type LlmCard,
  type NormalizedCard,
} from "./card.schema";

const BLOCK_TAGS = "p,div,h1,h2,h3,h4,h5,h6,li,tr,summary,details,dd,dt,section,article";

const collectJsonStrings = (node: unknown, out: string[]): string[] => {
  if (typeof node === "string" || typeof node === "number") out.push(String(node));
  else if (Array.isArray(node)) node.forEach((n) => collectJsonStrings(n, out));
  else if (node && typeof node === "object") Object.values(node).forEach((n) => collectJsonStrings(n, out));
  return out;
};

/**
 * Czytelny widok rekordu dla LLM: HTML jako tekst z podziałem na linie, XML bez deklaracji przestrzeni nazw, JSON bez zmian.
 * Ten sam widok służy do weryfikacji cytatów.
 */
export const payloadToText = (payload: string, payloadType: PayloadType | string): string => {
  if (payloadType === "html") {
    const $ = cheerio.load(payload);
    $("script,style,img,svg,noscript").remove();
    $("br").replaceWith("\n");
    $(BLOCK_TAGS).each((_, el) => {
      $(el).append("\n");
    });
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && /^https?:\/\//.test(href)) $(el).append(` (${href})`);
    });
    return $.root()
      .text()
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }
  if (payloadType === "xml") {
    return payload
      .replace(/\s+xmlns(:\w+)?="[^"]*"/g, "")
      .replace(/\s+xsi:schemaLocation="[^"]*"/g, "")
      .replace(/>\s+</g, ">\n<")
      .trim();
  }
  return payload;
};

const normalizeForMatch = (text: string): string =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[„”“"«»]/g, '"')
    .replace(/[‘’`']/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/** Tekst, w którym szukamy cytatów: widok dla LLM + tekst bez tagów (+ wartości JSON) */
export const buildHaystack = (payload: string, payloadType: PayloadType | string): string => {
  const parts = [payloadToText(payload, payloadType)];
  if (payloadType === "html" || payloadType === "xml") {
    parts.push(
      cheerio
        .load(payload, { xml: payloadType === "xml" })
        .root()
        .text(),
    );
  } else if (payloadType === "json") {
    try {
      parts.push(collectJsonStrings(JSON.parse(payload), []).join("\n"));
    } catch {
      parts.push(payload);
    }
  }
  return normalizeForMatch(parts.join("\n"));
};

/** Cytat może zawierać wielokropek; wtedy każdy fragment (>= 3 znaki) musi wystąpić w źródle */
export const isQuoteInSource = (quote: string, haystack: string): boolean => {
  const fragments = normalizeForMatch(quote)
    .split(/\.{3}|…/)
    .map((f) => f.trim().replace(/^"|"$/g, "").trim())
    .filter((f) => f.length >= 3);
  return fragments.length > 0 && fragments.every((f) => haystack.includes(f));
};

export const normalizeCard = (llm: LlmCard, payload: string, payloadType: PayloadType | string): NormalizedCard => {
  const haystack = buildHaystack(payload, payloadType);

  const evidence: EvidenceItem[] = llm.evidence.map((e) => ({
    field: e.field,
    quote: e.quote,
    verified: isQuoteInSource(e.quote, haystack),
  }));

  const verifiedFields = new Set(evidence.filter((e) => e.verified).map((e) => e.field));
  const trlStated = evidence.some((e) => e.verified && e.field === "trl" && /\btrl\b/i.test(e.quote));

  const fieldBasis = {} as Record<CardField, FieldBasis>;
  for (const field of CARD_FIELDS) {
    const claimed = llm.fieldBasis[field];
    let basis: FieldBasis = claimed === "CONFIRMED" && verifiedFields.has(field) ? "CONFIRMED" : "ESTIMATED";
    if (ALWAYS_ESTIMATED.includes(field)) basis = "ESTIMATED";
    if (field === "trl") basis = trlStated && llm.trl !== null ? "CONFIRMED" : "ESTIMATED";
    fieldBasis[field] = basis;
  }

  return { ...llm, evidence, fieldBasis };
};
