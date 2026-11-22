import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { dbPathFromUrl, restoreSnapshot } from "./restore-snapshot";

const SCHEMA = `
  CREATE TABLE _prisma_migrations (id TEXT PRIMARY KEY);
  CREATE TABLE ScrapeRun (id INTEGER PRIMARY KEY);
  CREATE TABLE RawRecord (id INTEGER PRIMARY KEY);
  CREATE TABLE InnovationCard (id INTEGER PRIMARY KEY);
`;

const makeDb = (path: string, cards: number) => {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.run(SCHEMA);
  for (let i = 1; i <= cards; i++) db.run("INSERT INTO InnovationCard (id) VALUES (?)", [i]);
  db.close();
};

const cardsIn = (path: string) => {
  const db = new Database(path, { readonly: true });
  const n = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM InnovationCard").get()!.n;
  db.close();
  return n;
};

describe("restoreSnapshot", () => {
  let dir: string;
  let dbPath: string;
  let snapshotPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "restore-"));
    dbPath = join(dir, "data", "dev.db");
    snapshotPath = join(dir, "snapshot.db");
    makeDb(snapshotPath, 3);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("wgrywa snapshot, gdy bazy nie ma (tworzy też katalog)", () => {
    const result = restoreSnapshot({ dbPath, snapshotPath });

    expect(result).toEqual({ action: "restored", counts: { runs: 0, records: 0, cards: 3 } });
    expect(cardsIn(dbPath)).toBe(3);
    expect(existsSync(`${dbPath}.restore-tmp`)).toBe(false);
  });

  it("wgrywa snapshot do pustej bazy i usuwa stare -wal/-shm", () => {
    makeDb(dbPath, 0);
    writeFileSync(`${dbPath}-wal`, "stary wal");
    writeFileSync(`${dbPath}-shm`, "stary shm");

    const result = restoreSnapshot({ dbPath, snapshotPath });

    expect(result.action).toBe("restored");
    expect(cardsIn(dbPath)).toBe(3);
    expect(existsSync(`${dbPath}-wal`)).toBe(false);
    expect(existsSync(`${dbPath}-shm`)).toBe(false);
  });

  it("NIE nadpisuje bazy z danymi", () => {
    makeDb(dbPath, 1);
    const before = readFileSync(dbPath);

    const result = restoreSnapshot({ dbPath, snapshotPath });

    expect(result).toEqual({ action: "skipped", reason: "has-data" });
    expect(readFileSync(dbPath).equals(before)).toBe(true);
  });

  it("brak snapshotu nie jest błędem: baza zostaje pusta", () => {
    rmSync(snapshotPath);

    expect(restoreSnapshot({ dbPath, snapshotPath })).toEqual({ action: "skipped", reason: "no-snapshot" });
    expect(existsSync(dbPath)).toBe(false);
  });

  it("odrzuca snapshot, który nie jest bazą Radaru, i nie rusza bazy", () => {
    const other = new Database(snapshotPath.replace("snapshot", "other"));
    other.run("CREATE TABLE cos (id INTEGER)");
    other.close();

    expect(() => restoreSnapshot({ dbPath, snapshotPath: snapshotPath.replace("snapshot", "other") })).toThrow(
      /brak tabel/,
    );
    expect(existsSync(dbPath)).toBe(false);
    expect(existsSync(`${dbPath}.restore-tmp`)).toBe(false);
  });

  it("odrzuca uszkodzony plik snapshotu", () => {
    writeFileSync(snapshotPath, "to nie jest sqlite, tylko tekst który ma ponad sto bajtów ".repeat(5));

    expect(() => restoreSnapshot({ dbPath, snapshotPath })).toThrow();
    expect(existsSync(dbPath)).toBe(false);
  });
});

describe("dbPathFromUrl", () => {
  it("czyta ścieżkę absolutną i względną", () => {
    expect(dbPathFromUrl("file:/app/backend/data/dev.db")).toBe("/app/backend/data/dev.db");
    expect(dbPathFromUrl("file:./data/x.db?connection_limit=1", "/app/backend")).toBe("/app/backend/data/x.db");
  });

  it("odrzuca inne bazy niż SQLite", () => {
    expect(() => dbPathFromUrl("postgres://x")).toThrow(/SQLite/);
    expect(() => dbPathFromUrl("")).toThrow();
  });
});
