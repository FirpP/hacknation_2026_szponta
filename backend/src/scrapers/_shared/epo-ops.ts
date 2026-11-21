/**
 * Klient EPO Open Patent Services (OPS) 3.2: OAuth2 client_credentials + wyszukiwanie bibliograficzne.
 * Wymaga darmowej rejestracji aplikacji: https://developers.epo.org (EPO_OPS_KEY / EPO_OPS_SECRET w .env).
 *
 * TODO(verify): kształt odpowiedzi JSON i parametr Range sprawdzone tylko z dokumentacji OPS, nie na żywo
 * (anonimowe wywołanie zwraca 403 "Fair Use"). Ekstrakcja dokumentów jest defensywna: szukamy rekurencyjnie
 * kluczy "exchange-document", a gdy ich nie ma, zwracamy czytelny błąd zamiast zgadywać.
 */
import { ENV } from "@lib/constants/env";
import { politeFetch } from "./http";
import { SkipSourceError, type RawItem } from "./types";

const OPS_BASE = "https://ops.epo.org/3.2";
/** OPS zwraca maks. 100 wyników na zapytanie */
const OPS_MAX_RANGE = 100;

let cachedToken: { value: string; expiresAt: number } | null = null;

const getAccessToken = async (): Promise<string> => {
  if (!ENV.EPO_OPS_KEY || !ENV.EPO_OPS_SECRET) {
    throw new SkipSourceError(
      "Brak EPO_OPS_KEY/EPO_OPS_SECRET w .env (darmowa rejestracja aplikacji: https://developers.epo.org)",
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const basic = Buffer.from(`${ENV.EPO_OPS_KEY}:${ENV.EPO_OPS_SECRET}`).toString("base64");
  const res = await politeFetch(`${OPS_BASE}/auth/accesstoken`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: string | number };
  if (!json.access_token) throw new Error("OPS: odpowiedź bez access_token");
  cachedToken = { value: json.access_token, expiresAt: Date.now() + Number(json.expires_in ?? 1200) * 1000 };
  return cachedToken.value;
};

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** Rekurencyjnie zbiera wartości pod kluczem "exchange-document" (obiekt lub tablica) */
const collectExchangeDocuments = (node: Json, out: { [key: string]: Json }[] = []): { [key: string]: Json }[] => {
  if (Array.isArray(node)) {
    for (const child of node) collectExchangeDocuments(child, out);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "exchange-document") {
        for (const doc of Array.isArray(value) ? value : [value]) {
          if (doc && typeof doc === "object" && !Array.isArray(doc)) out.push(doc);
        }
      } else {
        collectExchangeDocuments(value, out);
      }
    }
  }
  return out;
};

/** Wyszukiwanie CQL w published-data z danymi bibliograficznymi; surowy rekord = obiekt exchange-document (JSON) */
export const searchBiblio = async (cql: string, limit: number): Promise<RawItem[]> => {
  const token = await getAccessToken();
  const range = `1-${Math.min(limit, OPS_MAX_RANGE)}`;
  const url = `${OPS_BASE}/rest-services/published-data/search/biblio?${new URLSearchParams({ q: cql, Range: range })}`;
  const res = await politeFetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });

  const throttling = res.headers.get("x-throttling-control");
  if (throttling) console.log(`  OPS throttling: ${throttling}`);

  const docs = collectExchangeDocuments((await res.json()) as Json);
  if (docs.length === 0) {
    throw new Error("OPS: brak 'exchange-document' w odpowiedzi (puste wyniki albo inny kształt JSON), TODO(verify)");
  }

  return docs.map((doc) => {
    const country = String(doc["@country"] ?? "");
    const docNumber = String(doc["@doc-number"] ?? "");
    const kind = String(doc["@kind"] ?? "");
    const publicationNumber = `${country}${docNumber}${kind}`;
    return {
      externalId: publicationNumber || `family-${String(doc["@family-id"] ?? "unknown")}`,
      url: `https://worldwide.espacenet.com/patent/search?q=pn%3D${encodeURIComponent(publicationNumber)}`,
      payload: JSON.stringify(doc),
      payloadType: "json" as const,
    };
  });
};
