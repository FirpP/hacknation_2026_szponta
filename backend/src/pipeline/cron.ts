/**
 * Harmonogram jako osobny proces (do ręcznego użycia). Zwykle niepotrzebny: ten sam harmonogram startuje sam
 * razem z serwerem (src/index.ts, wyłączysz go przez RADAR_CRON_ENABLED=false). Gdy działają oba, run odpala się
 * tylko raz, bo drugi proces trafia na lock i pomija zaplanowany termin.
 *
 * Użycie: bun src/pipeline/cron.ts [--now]   (--now = pierwszy run od razu po starcie)
 */
import prisma from "@/prisma-client";
import { parseCliFlags } from "@/scrapers/_shared/cli";
import { startScheduler, stopScheduler, tick } from "./scheduler";

if (import.meta.main) {
  const flags = parseCliFlags();
  startScheduler();
  console.log("Ctrl+C kończy.");

  const shutdown = async () => {
    await stopScheduler();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (flags.now) await tick();
}
