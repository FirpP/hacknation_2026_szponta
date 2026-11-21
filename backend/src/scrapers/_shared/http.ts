import { ENV } from "@lib/constants/env";
import { RADAR_CONFIG } from "@/radar.config";
import { getRobotsPolicy, isPathAllowed } from "./robots";
import { HttpError, SkipSourceError } from "./types";

export type PoliteFetchInit = RequestInit & {
  /** Minimalny odstęp między requestami do tego hosta (ms); efektywnie max(globalny, ten, Crawl-delay) */
  minDelayMs?: number;
};

const nextAllowedAt = new Map<string, number>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Czeka, aż minie odstęp dla hosta, i rezerwuje kolejne okno */
const throttle = async (host: string, delayMs: number) => {
  const now = Date.now();
  const at = Math.max(now, nextAllowedAt.get(host) ?? 0);
  nextAllowedAt.set(host, at + delayMs);
  if (at > now) await sleep(at - now);
};

const retryAfterMs = (res: Response): number | null => {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
};

/**
 * fetch z polityką grzecznego crawlera:
 * robots.txt (ściśle), User-Agent, rate limit per host (min. 1 s), timeout, retry z wykładniczym backoffem.
 * Zwraca odpowiedź 2xx albo rzuca HttpError / SkipSourceError.
 */
export const politeFetch = async (url: string, init: PoliteFetchInit = {}): Promise<Response> => {
  const { minDelayMs, ...requestInit } = init;
  const target = new URL(url);
  const userAgent = ENV.SCRAPER_USER_AGENT;

  const robots = await getRobotsPolicy(target.origin, userAgent, RADAR_CONFIG.requestTimeoutMs, () =>
    throttle(target.host, Math.max(RADAR_CONFIG.minDelayMs, minDelayMs ?? 0)),
  );
  if (robots.rules === null) {
    throw new SkipSourceError(`${target.host}: ${robots.reason ?? "robots.txt niedostępny"}`);
  }
  if (!isPathAllowed(robots.rules, target.pathname + target.search)) {
    throw new SkipSourceError(`${target.host}: robots.txt zabrania dostępu do ${target.pathname}`);
  }

  const delayMs = Math.max(RADAR_CONFIG.minDelayMs, minDelayMs ?? 0, robots.crawlDelayMs ?? 0);
  const headers = new Headers(requestInit.headers);
  headers.set("User-Agent", userAgent);

  let lastError: unknown;
  for (let attempt = 1; attempt <= RADAR_CONFIG.maxAttempts; attempt++) {
    await throttle(target.host, delayMs);
    try {
      const res = await fetch(url, {
        ...requestInit,
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(RADAR_CONFIG.requestTimeoutMs),
      });
      if (res.ok) return res;

      lastError = new HttpError(res.status, url);
      if (!RETRYABLE_STATUS.has(res.status) || attempt === RADAR_CONFIG.maxAttempts) throw lastError;
      await res.body?.cancel();
      const backoff = retryAfterMs(res) ?? 1000 * 2 ** (attempt - 1);
      console.warn(
        `  ↻ HTTP ${res.status} ${target.host}, ponowienie ${attempt}/${RADAR_CONFIG.maxAttempts - 1} za ${backoff} ms`,
      );
      await sleep(backoff + Math.random() * 250);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      lastError = error;
      if (attempt === RADAR_CONFIG.maxAttempts) break;
      const backoff = 1000 * 2 ** (attempt - 1);
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `  ↻ ${message} (${target.host}), ponowienie ${attempt}/${RADAR_CONFIG.maxAttempts - 1} za ${backoff} ms`,
      );
      await sleep(backoff + Math.random() * 250);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

/** Wczytuje fixture z src/scrapers/__fixtures__ (tryb offline i testy) */
export const readFixture = (name: string): Promise<string> =>
  Bun.file(new URL(`../__fixtures__/${name}`, import.meta.url)).text();
