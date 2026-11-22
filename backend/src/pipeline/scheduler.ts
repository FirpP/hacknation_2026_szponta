/**
 * Harmonogram pipeline'u (node-cron): scrape wszystkich źródeł + analiza LLM, domyślnie codziennie o 03:00
 * czasu polskiego (RADAR_CRON, RADAR_TZ). Startuje razem z serwerem (src/index.ts), więc nic nie trzeba uruchamiać ręcznie.
 *
 * Dlaczego w procesie API, a nie w osobnym kontenerze: baza SQLite leży w jednym wolumenie, a tryb WAL nie znosi
 * otwierania jej z dwóch kontenerów naraz (patrz README). node-cron zamiast crona systemowego, bo działa tak samo
 * na hoście i w kontenerze, bez dostępu do crontaba.
 *
 * Nakładanie się runów blokują noOverlap (w procesie) i lockfile (między procesami, np. ręczne `bun run pipeline`).
 */
import cron, { type ScheduledTask } from "node-cron";
import { ENV } from "@lib/constants/env";
import { failOrphanRuns } from "@/scrapers/_shared/persist";
import { LockBusyError, withLock } from "./lock";
import { runPipeline } from "./pipeline";

/** Jedno uruchomienie z harmonogramu: błąd nigdy nie wychodzi poza tę funkcję, więc nie zatrzyma serwera */
export const tick = async (): Promise<void> => {
  try {
    await withLock("cron:pipeline", async () => {
      await failOrphanRuns();
      await runPipeline();
    });
  } catch (error) {
    if (error instanceof LockBusyError) {
      console.warn(`⏸ Pomijam zaplanowany run: ${error.message}`);
    } else {
      console.error("✖ Run z harmonogramu zakończony błędem:", error instanceof Error ? error.message : error);
    }
  }
};

export type SchedulerOptions = { expression?: string; timezone?: string; run?: () => Promise<void> };

const SLOT = Symbol.for("radar.scheduler");
const slot = globalThis as typeof globalThis & { [SLOT]?: ScheduledTask };

/**
 * Rejestruje harmonogram. Wywołanie ponowne zastępuje poprzedni: `bun --hot` wykonuje moduł wejściowy od nowa
 * przy każdej zmianie kodu, a globalThis przeżywa przeładowanie, więc bez tego harmonogramy by się mnożyły.
 */
export const startScheduler = (opts: SchedulerOptions = {}): ScheduledTask => {
  const expression = opts.expression ?? ENV.RADAR_CRON;
  const timezone = opts.timezone ?? ENV.RADAR_TZ;

  const previous = slot[SLOT];
  if (previous) void Promise.resolve(previous.destroy());

  const task = cron.schedule(expression, opts.run ?? tick, { name: "radar-pipeline", timezone, noOverlap: true });
  slot[SLOT] = task;

  const next = task.getNextRun();
  console.log(
    `⏰ Harmonogram Radaru: "${expression}" (${timezone}), następny run: ` +
      `${next ? next.toLocaleString("pl-PL", { timeZone: timezone }) : "brak"}`,
  );
  return task;
};

export const stopScheduler = async (): Promise<void> => {
  const task = slot[SLOT];
  slot[SLOT] = undefined;
  if (task) await task.destroy();
};
