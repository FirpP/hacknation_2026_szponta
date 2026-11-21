import type { SourceId } from "@/radar.config";

export type PayloadType = "html" | "xml" | "json";

/** Surowy rekord zwracany przez parser. Bez interpretacji: payload to oryginalny fragment odpowiedzi. */
export type RawItem = {
  externalId: string;
  url: string;
  payload: string;
  payloadType: PayloadType;
};

export type ScrapeOptions = {
  limit: number;
  /** Parsuj fixture zamiast pobierać z sieci */
  offline: boolean;
};

export type ScrapeResult = {
  items: RawItem[];
  /** Ustawione, gdy część rekordów pobrano, a potem wystąpił błąd (status PARTIAL) */
  partialError?: string;
};

export type SourceDefinition = {
  id: SourceId;
  run: (opts: ScrapeOptions) => Promise<ScrapeResult>;
};

/** Źródło świadomie pominięte (robots.txt, brak kluczy, niezweryfikowany dostęp) => ScrapeRun.status = SKIPPED */
export class SkipSourceError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SkipSourceError";
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message?: string,
  ) {
    super(message ?? `HTTP ${status} dla ${url}`);
    this.name = "HttpError";
  }
}
