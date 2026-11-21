import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { RADAR_CONFIG } from "@/radar.config";

/**
 * Blokada międzyprocesowa przed nakładaniem się runów (cron + ręczne uruchomienia).
 * Plik tworzony atomowo (flaga "wx" = O_CREAT|O_EXCL). Lock jest porzucony, gdy proces nie żyje
 * albo trzyma go dłużej niż RADAR_CONFIG.lockStaleAfterMs.
 */
export const LOCK_PATH = process.env.RADAR_LOCK_PATH ?? path.join(process.cwd(), "data", "radar.lock");

type LockInfo = { pid: number; label: string; startedAt: string };

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM = proces istnieje, ale należy do innego użytkownika
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

const readLock = (): LockInfo | null => {
  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf8")) as LockInfo;
  } catch {
    return null;
  }
};

const tryAcquire = (label: string): boolean => {
  mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  const info: LockInfo = { pid: process.pid, label, startedAt: new Date().toISOString() };
  try {
    writeFileSync(LOCK_PATH, JSON.stringify(info), { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return false;
  }
};

const release = () => {
  const current = readLock();
  if (current?.pid === process.pid) {
    try {
      unlinkSync(LOCK_PATH);
    } catch {
      // już usunięty
    }
  }
};

export class LockBusyError extends Error {
  constructor(readonly holder: LockInfo | null) {
    super(
      holder
        ? `Lock zajęty: "${holder.label}" (PID ${holder.pid}) od ${holder.startedAt}`
        : "Lock zajęty przez inny proces",
    );
    this.name = "LockBusyError";
  }
}

/** Wykonuje fn pod lockiem albo rzuca LockBusyError, gdy inny run trwa */
export const withLock = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  if (!tryAcquire(label)) {
    const holder = readLock();
    const stale =
      !holder ||
      !isProcessAlive(holder.pid) ||
      Date.now() - Date.parse(holder.startedAt) > RADAR_CONFIG.lockStaleAfterMs;
    if (!stale) throw new LockBusyError(holder);
    console.warn(`Usuwam porzucony lock (${holder ? `PID ${holder.pid}, ${holder.label}` : "uszkodzony plik"})`);
    try {
      unlinkSync(LOCK_PATH);
    } catch {
      // ktoś inny go usunął
    }
    if (!tryAcquire(label)) throw new LockBusyError(readLock());
  }

  const onSignal = () => {
    release();
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    return await fn();
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    release();
  }
};
