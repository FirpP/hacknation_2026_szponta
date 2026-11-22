/**
 * Automatyczne wgranie bazy startowej (snapshot) przy starcie kontenera.
 * Wołane przed `prisma migrate deploy`, więc starszy snapshot zostanie jeszcze zmigrowany.
 *
 * Bezpieczeństwo: baza z danymi NIGDY nie jest nadpisywana. Wgrywamy tylko wtedy, gdy plik bazy nie istnieje
 * albo jest pusty (zero rekordów w ScrapeRun, RawRecord i InnovationCard), więc nie ma czego stracić.
 * Żeby wgrać snapshot ponownie, usuń wolumen z bazą (patrz README).
 *
 * Konfiguracja (zmienne środowiskowe): DATABASE_URL (file:...) oraz SNAPSHOT_PATH (domyślnie data/snapshot.db,
 * w obrazach Dockera /app/seed/snapshot.db, wgrany przy buildzie).
 * Użycie: bun run db:restore
 */
import { Database } from "bun:sqlite";
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DATA_TABLES = ["ScrapeRun", "RawRecord", "InnovationCard"] as const;
const REQUIRED_TABLES = ["_prisma_migrations", ...DATA_TABLES] as const;

export type RadarCounts = { runs: number; records: number; cards: number };
export type RestoreResult =
  { action: "restored"; counts: RadarCounts } | { action: "skipped"; reason: "has-data" | "no-snapshot" };

/** Ścieżka pliku z DATABASE_URL w formie file:... (ścieżki względne liczymy od cwd) */
export const dbPathFromUrl = (url: string, cwd: string = process.cwd()): string => {
  if (!url.startsWith("file:"))
    throw new Error(`Restore obsługuje tylko SQLite (file:...), a DATABASE_URL to "${url}"`);
  const path = url.slice("file:".length).split("?")[0]!;
  if (!path) throw new Error("DATABASE_URL nie zawiera ścieżki pliku");
  return resolve(cwd, path);
};

const tableNames = (db: Database): Set<string> =>
  new Set(
    db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name),
  );

const count = (db: Database, table: string): number =>
  db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM "${table}"`).get()!.n;

/** Liczby rekordów Radaru albo null, gdy to nie jest (jeszcze) baza Radaru, np. pusty plik */
const readCounts = (path: string): RadarCounts | null => {
  const db = new Database(path, { readonly: true });
  try {
    const tables = tableNames(db);
    if (!DATA_TABLES.every((t) => tables.has(t))) return null;
    return { runs: count(db, "ScrapeRun"), records: count(db, "RawRecord"), cards: count(db, "InnovationCard") };
  } finally {
    db.close();
  }
};

const isEmpty = (c: RadarCounts | null) => c === null || (c.runs === 0 && c.records === 0 && c.cards === 0);

/** Plik musi być nieuszkodzoną bazą Radaru. Rzuca z opisem, co jest nie tak. */
const validateSnapshot = (path: string): RadarCounts => {
  const db = new Database(path, { readonly: true });
  try {
    const check = Object.values(db.query("PRAGMA integrity_check").get() as Record<string, unknown>)[0];
    if (check !== "ok") throw new Error(`Snapshot jest uszkodzony: ${String(check)}`);
    const tables = tableNames(db);
    const missing = REQUIRED_TABLES.filter((t) => !tables.has(t));
    if (missing.length > 0) throw new Error(`Snapshot nie jest bazą Radaru, brak tabel: ${missing.join(", ")}`);
    return { runs: count(db, "ScrapeRun"), records: count(db, "RawRecord"), cards: count(db, "InnovationCard") };
  } finally {
    db.close();
  }
};

export const restoreSnapshot = (opts: { dbPath: string; snapshotPath: string }): RestoreResult => {
  const { dbPath, snapshotPath } = opts;

  if (existsSync(dbPath) && !isEmpty(readCounts(dbPath))) return { action: "skipped", reason: "has-data" };
  if (!existsSync(snapshotPath)) return { action: "skipped", reason: "no-snapshot" };

  mkdirSync(dirname(dbPath), { recursive: true });
  // Walidujemy kopię obok bazy (nie oryginał): snapshot w obrazie leży w katalogu tylko do odczytu,
  // a SQLite w trybie WAL potrzebuje obok pliku zapisywalnego miejsca na -shm.
  const tmp = `${dbPath}.restore-tmp`;
  rmSync(tmp, { force: true });
  try {
    copyFileSync(snapshotPath, tmp);
    const counts = validateSnapshot(tmp);
    // Stare -wal/-shm nałożyłyby się na nową bazę
    rmSync(`${dbPath}-wal`, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    renameSync(tmp, dbPath);
    return { action: "restored", counts };
  } finally {
    rmSync(tmp, { force: true });
    rmSync(`${tmp}-wal`, { force: true });
    rmSync(`${tmp}-shm`, { force: true });
  }
};

if (import.meta.main) {
  const dbPath = dbPathFromUrl(process.env.DATABASE_URL ?? "");
  const snapshotPath = resolve(process.env.SNAPSHOT_PATH ?? "data/snapshot.db");
  try {
    const result = restoreSnapshot({ dbPath, snapshotPath });
    if (result.action === "restored") {
      const { cards, records, runs } = result.counts;
      console.log(
        `✔ Wgrano snapshot do pustej bazy: ${cards} kart, ${records} rekordów, ${runs} uruchomień scraperów.`,
      );
    } else if (result.reason === "has-data") {
      console.log(`Baza ${dbPath} ma już dane: snapshot pominięty.`);
    } else {
      console.warn(`⚠ Brak snapshotu (${snapshotPath}): startuję z pustą bazą.`);
    }
  } catch (error) {
    console.error(`✖ Nie udało się wgrać snapshotu: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
