import { parseArgs } from "node:util";
import prisma from "@/prisma-client";
import { LockBusyError, withLock } from "@/pipeline/lock";
import { failOrphanRuns } from "./persist";
import { executeScrape } from "./runner";
import type { SourceDefinition } from "./types";

export type CliFlags = {
  limit?: number;
  offline?: boolean;
  source?: string;
  retryFailed?: boolean;
  now?: boolean;
};

export const parseCliFlags = (argv: string[] = Bun.argv.slice(2)): CliFlags => {
  const { values } = parseArgs({
    args: argv,
    options: {
      limit: { type: "string" },
      offline: { type: "boolean" },
      source: { type: "string" },
      "retry-failed": { type: "boolean" },
      now: { type: "boolean" },
    },
    strict: true,
    allowPositionals: false,
  });
  let limit: number | undefined;
  if (values.limit !== undefined) {
    limit = Number.parseInt(values.limit, 10);
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error(`--limit musi być dodatnią liczbą całkowitą, podano "${values.limit}"`);
  }
  return {
    limit,
    offline: values.offline,
    source: values.source,
    retryFailed: values["retry-failed"],
    now: values.now,
  };
};

/**
 * Wspólny wrapper dla wszystkich komend: lock (bez nakładania się runów), sprzątanie osieroconych runów,
 * kody wyjścia: 0 OK, 1 błąd, 2 lock zajęty.
 */
export const runExclusiveCli = async (label: string, fn: () => Promise<boolean | void>) => {
  let exitCode = 0;
  try {
    const ok = await withLock(label, async () => {
      await failOrphanRuns();
      return fn();
    });
    if (ok === false) exitCode = 1;
  } catch (error) {
    if (error instanceof LockBusyError) {
      console.error(`⏸ ${error.message}. Spróbuj później.`);
      exitCode = 2;
    } else {
      // Pełny stack tylko z RADAR_DEBUG=1; domyślnie czytelny komunikat
      const detail =
        error instanceof Error ? (process.env.RADAR_DEBUG ? (error.stack ?? error.message) : error.message) : error;
      console.error("✖", detail);
      exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
  process.exit(exitCode);
};

/** Wejście dla `bun src/scrapers/<źródło>.ts [--limit N] [--offline]` */
export const runScraperCli = (source: SourceDefinition) =>
  runExclusiveCli(`scrape:${source.id}`, async () => {
    const flags = parseCliFlags();
    const summary = await executeScrape(source, { limit: flags.limit, offline: flags.offline });
    return summary.status !== "FAILED";
  });
