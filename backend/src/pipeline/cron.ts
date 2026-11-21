/**
 * Harmonogram w procesie (node-cron): pipeline co 24 h (domyślnie 03:00, RADAR_CRON w .env).
 * Wybór: node-cron zamiast crona systemowego, bo `bun run cron` działa tak samo na hoście i w kontenerze,
 * bez dostępu do crontaba. Nakładanie się runów blokuje noOverlap (w procesie) i lockfile (między procesami).
 *
 * Użycie: bun src/pipeline/cron.ts [--now]   (--now = pierwszy run od razu po starcie)
 */
import cron from "node-cron";
import prisma from "@/prisma-client";
import { ENV } from "@lib/constants/env";
import { failOrphanRuns } from "@/scrapers/_shared/persist";
import { parseCliFlags } from "@/scrapers/_shared/cli";
import { LockBusyError, withLock } from "./lock";
import { runPipeline } from "./pipeline";

const tick = async () => {
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

if (import.meta.main) {
  const flags = parseCliFlags();
  if (!cron.validate(ENV.RADAR_CRON)) {
    console.error(`✖ Niepoprawne wyrażenie RADAR_CRON: "${ENV.RADAR_CRON}"`);
    process.exit(1);
  }

  const task = cron.schedule(ENV.RADAR_CRON, tick, { name: "radar-pipeline", noOverlap: true });
  console.log(
    `⏰ Harmonogram Radaru: "${ENV.RADAR_CRON}" (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Ctrl+C kończy.`,
  );

  const shutdown = async () => {
    await task.stop();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (flags.now) await tick();
}
